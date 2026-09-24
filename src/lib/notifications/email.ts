// replyTo is optional and unrelated to Resend's own inbound-parse address
// concept: SOUP sets it to a specific application's
// app-{token}@minoihon.resend.app (see src/lib/applications/inboundReply.ts)
// so a student can just hit "Reply" in their mail client and have it land
// in that application's communication history via the inbound webhook —
// see src/app/api/resend/inbound/route.ts. Omitted entirely for emails
// with no application context.
// extraHeaders sets raw email headers on the outbound message — currently
// only used to set In-Reply-To/References when a staff reply continues an
// existing application thread (see sendApplicationReply in
// src/app/actions/adminMessages.ts), so the student's own mail client
// threads it correctly. Not related to replyTo, which controls where a
// reply from the recipient's mail client goes.
export type TransactionalEmail = { to: string; subject: string; html: string; idempotencyKey?: string; replyTo?: string; extraHeaders?: Record<string, string> };

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SOUP_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false as const, reason: "EMAIL_NOT_CONFIGURED" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from, to: [message.to], subject: message.subject, html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(message.extraHeaders && Object.keys(message.extraHeaders).length ? { headers: message.extraHeaders } : {}),
    }),
  });
  if (!response.ok) {
    console.error("SOUP_EMAIL_SEND_FAILED", response.status);
    return { sent: false as const, reason: "PROVIDER_ERROR" };
  }
  const data = await response.json().catch(() => ({}));
  return { sent: true as const, id: data?.id as string | undefined };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}
