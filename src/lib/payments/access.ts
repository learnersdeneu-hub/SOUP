import type { AppRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/auth/roles";

// The payment gate. Students (role CUSTOMER) can sign in, browse and fill in
// their profile freely, but anything that uploads a file or submits
// something on their behalf (documents, application approval, accommodation
// and insurance requests, SOUP Companion) needs a paid SOUP Scholar or SOUP
// Concierge package. Both are PREMIUM_COUNSELING payments, so one PAID row
// of that type unlocks everything.
//
// Staff and admin accounts are never gated: their permissions are unchanged.

export const PAYMENT_REQUIRED_CODE = "PAYMENT_REQUIRED";
// Lets the site-wide PaymentRequiredWatcher spot a blocked request without
// reading the response body the calling component still needs.
export const PAYMENT_REQUIRED_HEADER = "X-SOUP-Payment-Required";
export const PAYMENT_REQUIRED_MESSAGE =
  "This step needs the one-time $20 SOUP Scholar payment. Open Payments in the sidebar to download your invoice and submit your bank transfer reference.";

export function isGateExempt(role: AppRole | null | undefined) {
  return Boolean(role && STAFF_ROLES.includes(role));
}

export async function hasPaidAccess(profileId: string) {
  const paid = await prisma.payment.findFirst({
    where: { profileId, type: "PREMIUM_COUNSELING", status: "PAID" },
    select: { id: true },
  });
  return Boolean(paid);
}

export async function hasSubmissionAccess(profileId: string, role?: AppRole | null) {
  if (isGateExempt(role)) return true;
  return hasPaidAccess(profileId);
}

async function roleForProfile(profileId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { user: { select: { role: true } } } });
  return profile?.user.role ?? null;
}

// For API routes: returns a 402 response to send back, or null to continue.
export async function paymentRequiredResponse(profileId: string, role?: AppRole | null) {
  const resolvedRole = role === undefined ? await roleForProfile(profileId) : role;
  if (await hasSubmissionAccess(profileId, resolvedRole)) return null;
  return Response.json(
    { error: PAYMENT_REQUIRED_MESSAGE, code: PAYMENT_REQUIRED_CODE, paymentUrl: "/payments" },
    { status: 402, headers: { [PAYMENT_REQUIRED_HEADER]: "1" } },
  );
}

// For server actions: sends the student to Payments (a redirect, because
// Next.js hides thrown server-action error messages in production).
export async function assertSubmissionAccess(profileId: string, role?: AppRole | null) {
  const resolvedRole = role === undefined ? await roleForProfile(profileId) : role;
  if (!(await hasSubmissionAccess(profileId, resolvedRole))) redirect("/payments?required=1#invoice");
}
