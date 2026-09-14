export type TransactionalEmail = { to: string; subject: string; html: string; idempotencyKey?: string };

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
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
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
