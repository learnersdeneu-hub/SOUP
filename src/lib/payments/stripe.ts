import { createHmac, timingSafeEqual } from "crypto";

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe payments are not configured.");
  return key;
}

export async function createStripeCheckoutSession(input: {
  paymentId: string;
  customerEmail: string;
  title: string;
  description: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", input.customerEmail);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.paymentId);
  body.set("metadata[paymentId]", input.paymentId);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  body.set("line_items[0][price_data][product_data][name]", input.title);
  body.set("line_items[0][price_data][product_data][description]", input.description);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeSecret()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id || !data?.url) throw new Error(data?.error?.message || "Could not start payment checkout.");
  return data as { id: string; url: string };
}

export async function getStripeCheckoutSession(sessionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecret()}` }, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Could not verify payment.");
  return data as { id: string; payment_status?: string; payment_intent?: string; client_reference_id?: string; metadata?: Record<string,string> };
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string, toleranceSeconds = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    try { const candidate = Buffer.from(signature, "hex"); return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer); }
    catch { return false; }
  });
}
