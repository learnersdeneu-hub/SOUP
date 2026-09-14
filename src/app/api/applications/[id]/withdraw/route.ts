import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { applicationWithdrawSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { authUser: user, profile } = current;
  const parsed = await parseJsonBody(request, applicationWithdrawSchema);
  if (!parsed.ok) return parsed.response;
  const reason = parsed.data.reason.trim();
  if (!reason) return Response.json({ error: "Tell us why you are withdrawing this application." }, { status: 400 });

  const application = await prisma.studentApplication.findFirst({ where: { id: params.id, profileId: profile.id }, include: { university: { select: { name: true } } } });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (["SUBMITTED", "UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "ENROLLED"].includes(application.status)) {
    return Response.json({ error: "This application has already reached the university. Ask SOUP staff to process the withdrawal with the institution so the official record stays accurate." }, { status: 409 });
  }
  if (application.status === "WITHDRAWN") return Response.json({ ok: true, status: "WITHDRAWN" });

  const now = new Date();
  await prisma.$transaction([
    prisma.studentApplication.update({ where: { id: application.id }, data: { status: "WITHDRAWN", withdrawnAt: now, withdrawalReason: reason, lastStudentActionAt: now } }),
    prisma.studentApplicationEvent.create({ data: { applicationId: application.id, actorUserId: user.id, eventType: "APPLICATION_WITHDRAWN_BY_STUDENT", fromStatus: application.status, toStatus: "WITHDRAWN", message: `Student withdrew the ${application.university?.name || "university"} application before submission.`, metadata: { reason } } }),
    prisma.notification.create({ data: { profileId: profile.id, type: "SYSTEM", title: "Application withdrawn", body: `${application.university?.name || "Your application"} was withdrawn before submission.`, href: "/applications" } }),
  ]);
  return Response.json({ ok: true, status: "WITHDRAWN" });
}
