import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/logging/safe";
import { verifyResendWebhookSignature } from "@/lib/resend/inboundSignature";
import { RESEND_INBOUND_DOMAIN } from "@/lib/applications/inboundReply";
import { resendSignatureHeadersSchema, resendInboundEventSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Matches an inbound reply address of the exact shape SOUP hands out:
// app-{token}@minoihon.resend.app. Anything else in the To:/Cc: list
// (other recipients the student's mail client added) is ignored.
const REPLY_ADDRESS_PATTERN = new RegExp(`^app-([a-z0-9-]+)@${RESEND_INBOUND_DOMAIN.replace(/\./g, "\\.")}$`, "i");

function asList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function headerValue(headers: { name: string; value: string }[] | undefined, name: string): string | null {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value || null;
}

// Attachment metadata only, per spec — filename/content-type/size where
// Resend provides them, never any attachment content field, regardless of
// what the payload actually includes.
function attachmentMetadata(attachments: Record<string, unknown>[] | undefined) {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.map((attachment) => ({
    filename: typeof attachment.filename === "string" ? attachment.filename : undefined,
    contentType: typeof attachment.content_type === "string" ? attachment.content_type : undefined,
    size: typeof attachment.size === "number" ? attachment.size : undefined,
  }));
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Receives Resend's "email.received" inbound webhook: a student replying
// to a SOUP email lands here. This is a server-to-server endpoint with no
// signed-in user, so every bit of trust comes from (a) the Svix signature
// proving the request really came from Resend, and (b) the per-application
// inboundReplyToken embedded in the destination address proving which
// application the reply belongs to — see src/lib/applications/inboundReply.ts
// for why that token, not applicationId itself, is what's exposed as the
// email address.
export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logServerError("SOUP_RESEND_INBOUND_NOT_CONFIGURED");
    return new Response("Webhook not configured", { status: 500 });
  }

  const parsedHeaders = resendSignatureHeadersSchema.safeParse({
    id: request.headers.get("svix-id") || "",
    timestamp: request.headers.get("svix-timestamp") || "",
    signature: request.headers.get("svix-signature") || "",
  });
  if (!parsedHeaders.success || !verifyResendWebhookSignature(raw, parsedHeaders.data, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsedEvent = resendInboundEventSchema.safeParse(json);
  if (!parsedEvent.success) return new Response("Invalid payload", { status: 400 });
  const event = parsedEvent.data;

  // Resend may be configured to send other event types to the same
  // endpoint later; acknowledge anything that isn't this one instead of
  // erroring, so a future dashboard change doesn't start failing deliveries
  // this route was never meant to process.
  if (event.type !== "email.received") return Response.json({ received: true, skipped: true });

  const providerEventId = event.data.email_id || event.data.id;
  if (!providerEventId) return new Response("Missing email id", { status: 400 });

  const toList = asList(event.data.to);
  const ccList = asList(event.data.cc);
  const destination = [...toList, ...ccList].find((address) => REPLY_ADDRESS_PATTERN.test(address));
  const token = destination ? destination.match(REPLY_ADDRESS_PATTERN)?.[1] : undefined;

  const headers = event.data.headers;
  const messageId = headerValue(headers, "Message-ID");
  const inReplyTo = headerValue(headers, "In-Reply-To");
  const referencesHeader = headerValue(headers, "References");

  let applicationId: string | undefined;

  if (token) {
    const application = await prisma.studentApplication.findUnique({ where: { inboundReplyToken: token }, select: { id: true } });
    applicationId = application?.id;
  }

  // Fallback: identify by threading headers if the destination address
  // itself didn't resolve — e.g. the student's mail client only kept the
  // unique address in In-Reply-To/References rather than in To:. Only
  // matches a Message-ID SOUP itself has already recorded against an
  // application (inbound or, once outbound sends log here too, outbound),
  // so this can never attach a reply to an application it has no prior,
  // already-scoped relationship with.
  if (!applicationId && (inReplyTo || referencesHeader)) {
    const candidateIds = [inReplyTo, ...(referencesHeader ? referencesHeader.split(/\s+/) : [])].filter((value): value is string => Boolean(value));
    if (candidateIds.length) {
      const priorMessage = await prisma.applicationMessage.findFirst({
        where: { messageId: { in: candidateIds } },
        select: { applicationId: true },
      });
      applicationId = priorMessage?.applicationId;
    }
  }

  if (!applicationId) {
    // Acknowledge anyway: this is a delivery SOUP genuinely cannot place
    // (address token doesn't match a real application, or was tampered
    // with), not a transient failure Resend should retry.
    logServerError("SOUP_RESEND_INBOUND_UNRESOLVED_DESTINATION");
    return Response.json({ received: true, skipped: true });
  }

  try {
    await prisma.applicationMessage.create({
      data: {
        applicationId,
        providerEventId,
        messageId,
        inReplyTo,
        references: referencesHeader,
        fromAddress: event.data.from,
        toAddresses: toList,
        ccAddresses: ccList.length ? ccList : undefined,
        subject: event.data.subject || null,
        textBody: event.data.text || null,
        htmlBody: event.data.html || null,
        attachments: attachmentMetadata(event.data.attachments),
        receivedAt: event.data.created_at ? new Date(event.data.created_at) : new Date(),
      },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      // Resend/Svix redeliver on anything short of a fast 2xx — this is an
      // expected retry of an email already saved, not a real failure.
      return Response.json({ received: true, duplicate: true });
    }
    logServerError("SOUP_RESEND_INBOUND_SAVE_FAILED", error);
    return new Response("Failed to save message", { status: 500 });
  }

  const staffProfiles = await prisma.profile.findMany({
    where: { user: { role: { in: ["ADMIN", "SUPPORT"] }, accountStatus: "ACTIVE" } },
    select: { id: true },
  }).catch(() => []);
  if (staffProfiles.length) {
    await prisma.notification.createMany({
      data: staffProfiles.map((staffProfile) => ({
        profileId: staffProfile.id,
        type: "MESSAGE" as const,
        title: "New reply on an application",
        body: `A student replied by email${event.data.subject ? `: "${event.data.subject}"` : "."}`,
        href: `/admin/applications/${applicationId}`,
      })),
    }).catch((error) => logServerError("SOUP_RESEND_INBOUND_STAFF_NOTIFICATION_ERROR", error));
  }

  return Response.json({ received: true });
}
