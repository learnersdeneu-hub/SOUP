import { prisma } from "@/lib/prisma";
import { verifyStripeSignature } from "@/lib/payments/stripe";
import { stripeSignatureSchema, stripeWebhookEventSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const raw = await request.text();
  const rawSignature = request.headers.get("stripe-signature") || "";
  const parsedSignature = stripeSignatureSchema.safeParse(rawSignature);
  if (!parsedSignature.success || !verifyStripeSignature(raw, parsedSignature.data)) return new Response("Invalid signature", { status: 400 });
  let event: unknown;
  try { event = JSON.parse(raw) as unknown; } catch { return new Response("Invalid JSON", { status: 400 }); }
  const parsedEvent = stripeWebhookEventSchema.safeParse(event);
  if (!parsedEvent.success) return new Response("Invalid JSON", { status: 400 });
  const eventRecord = parsedEvent.data;
  const session = eventRecord.data.object;
  if (eventRecord.type === "checkout.session.completed" && session.payment_status === "paid") {
    const metadata = session.metadata !== null && typeof session.metadata === "object" && !Array.isArray(session.metadata) ? session.metadata as Record<string, unknown> : {};
    const paymentId = String(metadata.paymentId || session.client_reference_id || "").trim();
    if (paymentId) {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment && payment.status !== "PAID" && (!payment.providerSessionId || payment.providerSessionId === String(session.id || ""))) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), providerSessionId: String(session.id || ""), providerPaymentId: session.payment_intent ? String(session.payment_intent) : null } });
          await tx.notification.create({ data: { profileId: payment.profileId, type: "PAYMENT", title: "Payment confirmed", body: `${payment.title} has been paid successfully.`, href: "/payments" } });
        });
      }
    }
  }
  return Response.json({ received: true });
}
