import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/apiUser";
import { PAYMENT_REVIEW_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { BANK_TRANSFER_PROVIDER, bankMetadata } from "@/lib/payments/bankTransfer";

export const dynamic = "force-dynamic";

// Opens the receipt / paid invoice a student attached to a bank-transfer
// payment, via a 5-minute signed URL. The student who uploaded it and
// finance/admin reviewers only.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiUser();
  if (!current.ok) return current.response;
  const payment = await prisma.payment.findFirst({ where: { id: params.id, provider: BANK_TRANSFER_PROVIDER } });
  const isReviewer = PAYMENT_REVIEW_ROLES.includes(current.user.role);
  const ref = payment ? bankMetadata(payment.metadata).proofStorageRef : "";
  if (!payment || !ref || (!isReviewer && payment.profileId !== current.profile?.id)) {
    return Response.json({ error: "Receipt not found." }, { status: 404 });
  }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data, error } = await createAdminClient().storage.from("documents").createSignedUrl(ref, 60 * 5);
  if (error || !data) return Response.json({ error: "Could not open the receipt." }, { status: 502 });
  return NextResponse.redirect(data.signedUrl, 303);
}
