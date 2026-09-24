import { createHmac, timingSafeEqual } from "crypto";

// Resend delivers all of its webhooks (including the inbound-email
// "email.received" event) signed via Svix's standard webhook scheme:
// HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{rawBody}", keyed by the
// base64 portion of the "whsec_..." signing secret Resend shows once when
// the webhook endpoint is created in its dashboard. The result is compared
// against one or more "v1,<signature>" entries in the svix-signature
// header (space-separated — Resend sends more than one during secret
// rotation, so any match is accepted, mirroring how verifyStripeSignature
// in src/lib/payments/stripe.ts accepts any of Stripe's "v1=" entries).
//
// This mirrors that same file's pattern deliberately: raw body in, decoded
// secret, HMAC compare via timingSafeEqual (never ===), plus a timestamp
// tolerance window to reject stale/replayed signed payloads.
export function verifyResendWebhookSignature(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string,
  toleranceSeconds = 300
): boolean {
  const timestampSeconds = Number(headers.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > toleranceSeconds) return false;

  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) return false;

  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent, "utf8").digest();

  const candidates = headers.signature
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((value): value is string => Boolean(value));

  return candidates.some((candidate) => {
    try {
      const candidateBytes = Buffer.from(candidate, "base64");
      return candidateBytes.length === expected.length && timingSafeEqual(candidateBytes, expected);
    } catch {
      return false;
    }
  });
}
