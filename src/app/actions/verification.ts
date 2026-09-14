"use server";

import { prisma } from "@/lib/prisma";
import { requireProfile, requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";

export async function submitForVerification(credentialId: string) {
  const { profile } = await requireProfile();
  const credential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    include: { credentialType: { include: { slaConfigs: true } } },
  });
  if (credential.profileId !== profile.id) throw new Error("You do not have access to this credential.");

  const existingOpen = await prisma.verificationRequest.findFirst({
    where: {
      credentialId,
      status: { in: ["SUBMITTED", "ROUTED_AUTOMATED", "ROUTED_MANUAL", "ESCALATED_TO_MANUAL"] },
    },
  });
  if (existingOpen) return existingOpen;

  const routedStatus = credential.credentialType.requiresMakerChecker ? "ROUTED_MANUAL" : "ROUTED_AUTOMATED";
  const globalSla = credential.credentialType.slaConfigs.find((item) => item.orgTypeId === null);
  const slaDays = globalSla?.slaDays ?? credential.credentialType.defaultSlaDays;
  const expiresAt = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const request = await tx.verificationRequest.create({
      data: {
        credentialId,
        requestedMethod: credential.sourceType,
        status: routedStatus,
        expiresAt,
      },
    });
    await tx.credential.update({ where: { id: credentialId }, data: { verificationStatus: "PENDING_VERIFICATION" } });
    await tx.notification.create({
      data: {
        profileId: profile.id,
        type: "VERIFICATION",
        title: "Verification submitted",
        body: `${credential.credentialType.label} has been submitted for verification.`,
        href: "/documents",
      },
    });
    return request;
  });
}

// Until the organization maker-checker console is implemented, only an
// internal ADMIN may resolve a verification request. This closes the prior
// unauthenticated server-action path without pretending vendor review exists.
export async function resolveVerification(
  verificationRequestId: string,
  decision: "VERIFIED" | "REJECTED",
  notes?: string
) {
  await requireRole(ADMIN_ROLES);
  const request = await prisma.verificationRequest.findUniqueOrThrow({
    where: { id: verificationRequestId },
    include: { credential: true },
  });

  return prisma.$transaction(async (tx) => {
    const resolved = await tx.verificationRequest.update({
      where: { id: verificationRequestId },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNotes: notes?.trim() || null },
    });
    await tx.credential.update({ where: { id: request.credentialId }, data: { verificationStatus: decision } });
    await tx.notification.create({
      data: {
        profileId: request.credential.profileId,
        type: "VERIFICATION",
        title: decision === "VERIFIED" ? "Credential verified" : "Verification not approved",
        body: decision === "VERIFIED" ? "A saved credential record has been verified." : "A saved credential record could not be verified. Review the request for details.",
        href: "/documents",
      },
    });
    return resolved;
  });
}
