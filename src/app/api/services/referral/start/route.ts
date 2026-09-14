import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureStudentCase } from "@/lib/student/case";
import { resolveReferralAttribution } from "@/lib/services/attribution";
import { startPartnerReferral } from "@/lib/services/referrals";
import { safeHttpUrl } from "@/lib/security/urls";
import { parseJsonBody } from "@/lib/validation/http";
import { partnerReferralStartSchema } from "@/lib/validation/schemas";
import type { PartnerType, ServiceReferralType } from "@prisma/client";

const REFERRAL_BY_PARTNER: Partial<Record<PartnerType, ServiceReferralType>> = {
  ACCOMMODATION: "ACCOMMODATION",
  STUDENT_FINANCE: "STUDENT_FINANCE",
  SCHOLARSHIP: "SCHOLARSHIP",
  TRAVEL: "TRAVEL",
};

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, partnerReferralStartSchema);
  if (!parsed.ok) return parsed.response;
  const { partnerId, source } = parsed.data;

  const partner = await prisma.partner.findFirst({ where: { id: partnerId, status: "ACTIVE" } });
  if (!partner) return Response.json({ error: "This SOUP partner is not currently active." }, { status: 404 });
  const referralType = REFERRAL_BY_PARTNER[partner.type];
  if (!referralType) return Response.json({ error: "This partner type is not available through this route." }, { status: 400 });
  const destination = safeHttpUrl(partner.transactionUrl || partner.websiteUrl, 1200);
  if (!destination) return Response.json({ error: "This partner does not yet have a safe authorized online transaction/referral route configured." }, { status: 409 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ url: destination, tracked: false });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ url: destination, tracked: false });

  const studentCase = await ensureStudentCase(profile.id);
  const attribution = await resolveReferralAttribution(profile.id, source);
  const referral = await startPartnerReferral({
    profileId: profile.id,
    studentCaseId: studentCase.id,
    type: referralType,
    partnerId: partner.id,
    title: `${partner.type.replaceAll("_", " ")} through ${partner.name}`,
    externalUrl: destination,
    counselorRationale: attribution.source === "COUNSELOR"
      ? "Student chose an active SOUP partner route after Counselor guidance."
      : "Student chose an active SOUP partner route from the SOUP service directory.",
    attribution,
  });
  return Response.json({ url: destination, tracked: true, referralId: referral.id });
}
