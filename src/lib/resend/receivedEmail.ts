import { resendReceivedEmailSchema } from "@/lib/validation/schemas";

// Resend's "email.received" webhook (verified and parsed in
// src/app/api/resend/inbound/route.ts) carries metadata only — no body, no
// headers, confirmed against Resend's own docs after a real test showed an
// inbound reply saving with an empty body. The actual text/html and the
// raw headers (In-Reply-To, References) only exist behind this separate,
// authenticated call, keyed by the webhook's own email_id.
export async function fetchReceivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = await response.json().catch(() => null);
  const parsed = resendReceivedEmailSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
