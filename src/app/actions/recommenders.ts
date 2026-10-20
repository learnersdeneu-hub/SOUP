"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { updateExtracurricularMeta } from "@/lib/applications/extracurricularMeta";

const RECOMMENDER_TYPES = ["TEACHER", "COUNSELOR", "OTHER"];
const INVITE_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days — a recommender may take a while to write the letter

function clean(value: FormDataEntryValue | null, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
}

export async function addRecommender(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await requireProfile();
  const type = clean(formData.get("type"), 20).toUpperCase() || "TEACHER";
  const firstName = clean(formData.get("firstName"), 80);
  const lastName = clean(formData.get("lastName"), 80);
  const email = clean(formData.get("email"), 160).toLowerCase();
  const waiverAcknowledged = clean(formData.get("waiverAcknowledged")) === "true";

  if (!RECOMMENDER_TYPES.includes(type)) return { ok: false, error: "Unknown recommender type." };
  if (!firstName || !lastName) return { ok: false, error: "Enter the recommender's first and last name." };
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  await prisma.recommender.create({
    data: {
      profileId: profile.id,
      type,
      firstName,
      lastName,
      email,
      subjectOrTitle: clean(formData.get("subjectOrTitle"), 120) || null,
      institution: clean(formData.get("institution"), 200) || null,
      relationshipToStudent: clean(formData.get("relationshipToStudent"), 200) || null,
      waiverAcknowledged,
      waiverAcknowledgedAt: waiverAcknowledged ? new Date() : null,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
  revalidatePath("/colleges");
  return { ok: true };
}

export async function removeRecommender(formData: FormData) {
  const { profile } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  if (!id) throw new Error("Missing recommender id.");
  await prisma.recommender.deleteMany({ where: { id, profileId: profile.id } });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
  revalidatePath("/colleges");
}

async function sendInviteEmail(recommender: { id: string; firstName: string; lastName: string; email: string; inviteToken: string | null }, studentName: string, isResend: boolean) {
  const link = `${siteUrl()}/recommend/${recommender.inviteToken}`;
  const result = await sendTransactionalEmail({
    to: recommender.email,
    subject: isResend ? `Reminder: recommendation letter request from ${studentName}` : `${studentName} has invited you to write a recommendation letter`,
    html: `<p>Hello ${escapeHtml(recommender.firstName)},</p><p>${escapeHtml(studentName)} has invited you to write a college recommendation letter through SOUP, a university application platform.</p><p>Use the secure link below to submit your letter — either by typing it directly or uploading a file. No account or sign-up is required.</p><p><a href="${link}">${link}</a></p><p>If you weren't expecting this, you can safely ignore this email.</p>`,
    idempotencyKey: `recommender-invite-${recommender.id}-${Date.now()}`,
  });
  return result;
}

export async function inviteRecommender(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile, user } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  const recommender = await prisma.recommender.findFirst({ where: { id, profileId: profile.id } });
  if (!recommender) return { ok: false, error: "Recommender not found." };

  const inviteToken = randomBytes(32).toString("hex");
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);
  const now = new Date();
  const updated = await prisma.recommender.update({
    where: { id: recommender.id },
    data: {
      inviteToken,
      inviteTokenExpiresAt,
      status: recommender.status === "NOT_INVITED" ? "INVITED" : recommender.status,
      invitedAt: recommender.invitedAt || now,
      lastInviteSentAt: now,
    },
  });

  const emailResult = await sendInviteEmail(updated, user.fullName || "A SOUP student", false);
  if (!emailResult.sent) return { ok: false, error: "The invite could not be emailed right now. Please try again shortly." };

  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
  revalidatePath("/colleges");
  return { ok: true };
}

export async function resendInvite(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile, user } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  const recommender = await prisma.recommender.findFirst({ where: { id, profileId: profile.id } });
  if (!recommender) return { ok: false, error: "Recommender not found." };
  if (recommender.status === "SUBMITTED") return { ok: false, error: "This recommender has already submitted their letter." };

  // Reuse the existing token if it's still valid rather than invalidating a
  // link the recommender may already have open; only mint a new one if it's
  // missing or expired.
  const stillValid = recommender.inviteToken && recommender.inviteTokenExpiresAt && recommender.inviteTokenExpiresAt.getTime() > Date.now();
  const inviteToken = stillValid ? recommender.inviteToken! : randomBytes(32).toString("hex");
  const inviteTokenExpiresAt = stillValid ? recommender.inviteTokenExpiresAt! : new Date(Date.now() + INVITE_TOKEN_TTL_MS);
  const now = new Date();
  const updated = await prisma.recommender.update({
    where: { id: recommender.id },
    data: {
      inviteToken,
      inviteTokenExpiresAt,
      status: recommender.status === "NOT_INVITED" ? "INVITED" : recommender.status,
      invitedAt: recommender.invitedAt || now,
      lastInviteSentAt: now,
      remindersSentCount: { increment: 1 },
    },
  });

  const emailResult = await sendInviteEmail(updated, user.fullName || "A SOUP student", true);
  if (!emailResult.sent) return { ok: false, error: "The reminder could not be emailed right now. Please try again shortly." };

  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
  revalidatePath("/colleges");
  return { ok: true };
}

export async function assignRecommenderToApplication(formData: FormData) {
  const { profile } = await requireProfile();
  const recommenderId = clean(formData.get("recommenderId"), 60);
  const applicationId = clean(formData.get("applicationId"), 60);
  const [recommender, application] = await Promise.all([
    prisma.recommender.findFirst({ where: { id: recommenderId, profileId: profile.id } }),
    prisma.studentApplication.findFirst({ where: { id: applicationId, profileId: profile.id } }),
  ]);
  if (!recommender || !application) throw new Error("Recommender or application not found.");
  await prisma.recommenderAssignment.upsert({
    where: { recommenderId_applicationId: { recommenderId, applicationId } },
    create: { recommenderId, applicationId },
    update: {},
  });
  revalidatePath("/colleges");
  revalidatePath("/dashboard");
}

export async function unassignRecommenderFromApplication(formData: FormData) {
  const { profile } = await requireProfile();
  const recommenderId = clean(formData.get("recommenderId"), 60);
  const applicationId = clean(formData.get("applicationId"), 60);
  const recommender = await prisma.recommender.findFirst({ where: { id: recommenderId, profileId: profile.id } });
  if (!recommender) throw new Error("Recommender not found.");
  await prisma.recommenderAssignment.deleteMany({ where: { recommenderId, applicationId } });
  revalidatePath("/colleges");
  revalidatePath("/dashboard");
}

export async function setRecommendersNotRequiredConfirmed(formData: FormData) {
  const { profile } = await requireProfile();
  const confirmed = clean(formData.get("confirmed")) === "true";
  await updateExtracurricularMeta(profile.id, { recommendersNotRequiredConfirmed: confirmed });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
}
