import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const RESEND_INBOUND_DOMAIN = "minoihon.resend.app";

export function inboundReplyAddress(token: string) {
  return `app-${token}@${RESEND_INBOUND_DOMAIN}`;
}

// Appended to application-related transactional emails that set replyTo to
// this address, so the student knows replying is a real, working option —
// without printing the address itself, which is an internal routing detail
// rather than something meant to be read or remembered.
export const REPLY_NOTICE_HTML = `<p style="color:#667085;font-size:12px;">You can reply directly to this email — SOUP receives it and saves it with this application.</p>`;

// Every application needs its own unguessable inbound reply address so a
// student's email reply can be attributed back to exactly one application
// without the address itself ever being (or requiring) the application's
// own id — a sequential/public id used directly would let anyone guess
// another student's reply address and inject messages into their
// communication history. Generated lazily on first use rather than
// backfilled for every existing row: nothing hands this address out to a
// student until something calls this, so there is no applicationId with a
// token that matters until then.
export async function getOrCreateInboundReplyToken(applicationId: string): Promise<string> {
  const existing = await prisma.studentApplication.findUnique({
    where: { id: applicationId },
    select: { inboundReplyToken: true },
  });
  if (existing?.inboundReplyToken) return existing.inboundReplyToken;

  const token = randomUUID();
  const updated = await prisma.studentApplication.update({
    where: { id: applicationId },
    data: { inboundReplyToken: token },
    select: { inboundReplyToken: true },
  });
  return updated.inboundReplyToken as string;
}
