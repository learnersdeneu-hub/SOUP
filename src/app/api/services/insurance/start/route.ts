import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureStudentCase } from "@/lib/student/case";
import { resolveReferralAttribution } from "@/lib/services/attribution";
import { startPartnerReferral } from "@/lib/services/referrals";
import { safeHttpUrl } from "@/lib/security/urls";
import { parseJsonBody } from "@/lib/validation/http";
import { insuranceStartRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, insuranceStartRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const partner = await prisma.partner.findFirst({
    where: { type: "INSURANCE", status: "ACTIVE", slug: "hellenic-sun-insuremart" },
    orderBy: { internalPriority: "asc" },
  });
  if (!partner) return Response.json({ error: "The SOUP insurance purchase channel is not configured right now." }, { status: 503 });
  const destination = safeHttpUrl(partner.transactionUrl, 1200);
  if (!destination) return Response.json({ error: "The SOUP insurance purchase channel is not configured with a safe online route right now." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ url: destination, tracked: false });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ url: destination, tracked: false });

  const studentCase = await ensureStudentCase(profile.id);
  const attribution = await resolveReferralAttribution(profile.id, body.source);
  const referral = await startPartnerReferral({
    profileId: profile.id,
    studentCaseId: studentCase.id,
    type: "INSURANCE",
    partnerId: partner.id,
    title: "Insurance purchase through insuremart",
    externalUrl: destination,
    counselorRationale: attribution.source === "COUNSELOR"
      ? "Student chose to continue from Counselor guidance into the authorized SOUP insurance transaction channel."
      : "Student chose to continue from SOUP into the authorized insurance transaction channel.",
    attribution,
  });
  return Response.json({ url: destination, tracked: true, referralId: referral.id });
}
