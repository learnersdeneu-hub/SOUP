import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const RESEND_INBOUND_DOMAIN = "minoihon.resend.app";

export function inboundReplyAddress(token: string) {
  return `app-${token}@${RESEND_INBOUND_DOMAIN}`;
}

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
