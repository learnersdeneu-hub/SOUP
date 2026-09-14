import { prisma } from "@/lib/prisma";

export async function resolveReferralAttribution(profileId: string, source: unknown) {
  const normalizedSource = String(source || "SERVICE_DIRECTORY").trim().toUpperCase().slice(0, 80);
  if (normalizedSource !== "COUNSELOR") {
    return { source: normalizedSource || "SERVICE_DIRECTORY", sourceSessionId: null, sourceMessageId: null };
  }

  const session = await prisma.chatSession.findFirst({
    where: { profileId, workflow: "COUNSELOR" },
    orderBy: { updatedAt: "desc" },
    include: { messages: { where: { role: "ASSISTANT" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return {
    source: "COUNSELOR",
    sourceSessionId: session?.id || null,
    sourceMessageId: session?.messages[0]?.id || null,
  };
}
