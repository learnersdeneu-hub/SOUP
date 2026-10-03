"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { SOUP_SUPPORT_EMAIL } from "@/lib/support/config";

function clean(value: FormDataEntryValue | null, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
}

// Public — no auth required. This is the only way a never-seen-before
// student gets into the system now: fill this in, wait for a staff member
// to approve it in /admin/access-requests, which then emails them a
// sign-in link. No Supabase auth user and no SOUP account is created here.
export async function submitAccessRequest(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName = clean(formData.get("fullName"), 120);
  const email = clean(formData.get("email"), 160).toLowerCase();
  const institutionName = clean(formData.get("institutionName"), 200);

  if (!fullName || !email || !institutionName) return { ok: false, error: "Full name, email and institution name are all required." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  const existingApproved = await prisma.accessRequest.findFirst({ where: { email, status: "APPROVED" } });
  if (existingApproved) return { ok: true }; // Already approved — the "check your request" screen tells them to just sign in.

  // Resubmitting (e.g. after a typo, or trying again after a denial) updates
  // the same row back to PENDING rather than piling up duplicate rows per
  // email.
  const existing = await prisma.accessRequest.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  if (existing) {
    await prisma.accessRequest.update({ where: { id: existing.id }, data: { fullName, institutionName, status: "PENDING", reviewedByUserId: null, reviewedAt: null, reviewNote: null } });
  } else {
    await prisma.accessRequest.create({ data: { fullName, email, institutionName } });
  }

  await sendTransactionalEmail({
    to: SOUP_SUPPORT_EMAIL,
    subject: `New SOUP access request — ${fullName}`,
    html: `<h2>New SOUP access request</h2><p><strong>Name:</strong> ${escapeHtml(fullName)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Institution:</strong> ${escapeHtml(institutionName)}</p><p><a href="${siteUrl()}/admin/access-requests">Review access requests</a></p>`,
    idempotencyKey: `access-request-${email}-${Date.now()}`,
  }).catch(() => undefined); // Request is saved either way; email is best-effort.

  return { ok: true };
}

export async function approveAccessRequest(id: string) {
  const { user } = await requireRole(ADMIN_ROLES);
  const request = await prisma.accessRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedByUserId: user.id, reviewedAt: new Date(), reviewNote: null },
  });

  const supabase = createClient({ flowType: "implicit" });
  await supabase.auth.signInWithOtp({
    email: request.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/magic-link?next=${encodeURIComponent("/dashboard")}`,
      data: { full_name: request.fullName, institution_name: request.institutionName },
    },
  }).catch(() => undefined); // Approval is recorded either way; the student (or staff) can resend from the admin list if this email send fails.

  revalidatePath("/admin/access-requests");
}

export async function denyAccessRequest(id: string, reason?: string) {
  const { user } = await requireRole(ADMIN_ROLES);
  await prisma.accessRequest.update({
    where: { id },
    data: { status: "DENIED", reviewedByUserId: user.id, reviewedAt: new Date(), reviewNote: reason?.trim().slice(0, 500) || null },
  });
  revalidatePath("/admin/access-requests");
}

// Lets staff re-send the invite link without changing the approval record —
// useful if the first signInWithOtp call above silently failed, or the
// link expired before the student used it.
export async function resendAccessInvite(id: string) {
  await requireRole(ADMIN_ROLES);
  const request = await prisma.accessRequest.findUniqueOrThrow({ where: { id } });
  if (request.status !== "APPROVED") return;

  const supabase = createClient({ flowType: "implicit" });
  await supabase.auth.signInWithOtp({
    email: request.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/magic-link?next=${encodeURIComponent("/dashboard")}`,
      data: { full_name: request.fullName, institution_name: request.institutionName },
    },
  }).catch(() => undefined);
}
