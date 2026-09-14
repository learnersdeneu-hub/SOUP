import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";

export async function getCustomerDashboardData(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
  if (!profile) return null;

  const [documents, documentCount, sessions, notifications, tickets, resumes, studentCase, applications, shortlists, checklists, referrals, payments, counselorSessions] = await Promise.all([
    prisma.document.findMany({ where: { profileId: profile.id }, orderBy: { uploadedAt: "desc" }, take: 8 }),
    prisma.document.count({ where: { profileId: profile.id } }),
    prisma.chatSession.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.notification.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.supportTicket.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.resume.findMany({ where: { profileId: profile.id, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.studentCase.findUnique({ where: { profileId: profile.id } }),
    prisma.studentApplication.findMany({
      where: { profileId: profile.id },
      orderBy: { updatedAt: "desc" },
      include: { university: true, program: true, documents: { include: { document: true } }, checklists: { include: { items: true } } },
      take: 20,
    }),
    prisma.universityShortlist.findMany({
      where: { profileId: profile.id },
      orderBy: { generatedAt: "desc" },
      include: {
        _count: { select: { items: true } },
        items: { orderBy: { position: "asc" }, include: { university: true, program: true }, take: 12 },
      },
      take: 5,
    }),
    prisma.journeyChecklist.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, include: { items: true }, take: 18 }),
    prisma.serviceReferral.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, include: { partner: true }, take: 8 }),
    prisma.payment.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.counselorSession.findMany({ where: { profileId: profile.id, status: { in: ["REQUESTED", "SCHEDULED"] } }, include: { counselor: true }, orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }], take: 5 }),
  ]);

  const activeChecklists = checklists.filter((checklist) => !isSupersededChecklist(checklist.sourceSnapshot)).slice(0, 6);
  const offers = applications.filter((item) => item.status === "OFFER_RECEIVED" || item.status === "CONDITIONAL_OFFER");
  const activeApplications = applications.filter((item) => !["REJECTED", "WITHDRAWN", "ENROLLED"].includes(item.status));
  const openChecklistItems = activeChecklists.flatMap((list) => list.items).filter((item) => !["COMPLETE", "NOT_APPLICABLE"].includes(item.status));
  const studentActionItems = openChecklistItems.filter((item) => ["ACTION_REQUIRED", "WAITING_FOR_DOCUMENT", "NOT_STARTED", "BLOCKED"].includes(item.status));
  const waitingOnSoup = activeApplications.filter((app) => app.ownership === "SOUP_MANAGED" && ["READY_TO_SUBMIT", "SUBMITTED", "UNDER_REVIEW"].includes(app.status));
  const documentAttention = documents.filter((doc) => ["MORE_INFO_REQUIRED", "REJECTED", "EXPIRED"].includes(doc.reviewStatus));
  const approvedDocuments = documents.filter((doc) => doc.reviewStatus === "APPROVED");
  const pendingPayments = payments.filter((item) => ["PENDING", "REQUIRES_ACTION"].includes(item.status));
  const pendingApplicationFees = applications.filter((item) => ["REQUIRED", "PENDING"].includes(item.applicationFeeStatus));
  const latestShortlist = shortlists[0] || null;
  const premiumPayments = payments.filter((payment) => payment.type === "PREMIUM_COUNSELING" && payment.status === "PAID");
  const conciergeActive = premiumPayments.some((payment) => {
    const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) ? payment.metadata as Record<string, unknown> : {};
    return payment.title === "SOUP Concierge" || metadata.plan === "premium_plus";
  });
  const plusActive = conciergeActive || premiumPayments.length > 0;

  const assignedCounselor = studentCase?.assignedStaffUserId
    ? await prisma.user.findUnique({ where: { id: studentCase.assignedStaffUserId }, select: { id: true, fullName: true, email: true, role: true } })
    : null;

  const completenessParts = [
    profile.user.fullName ? 15 : 0,
    profile.user.nationality ? 10 : 0,
    studentCase?.targetDegreeLevel ? 15 : 0,
    studentCase?.targetSubject ? 15 : 0,
    studentCase?.searchScope ? 15 : 0,
    documentCount ? 15 : 0,
    shortlists.length ? 15 : 0,
  ];
  const computedCompleteness = completenessParts.reduce((sum, value) => sum + value, 0);

  return {
    profile,
    documents,
    documentCount,
    approvedDocuments,
    documentAttention,
    sessions,
    notifications,
    tickets,
    resumes,
    studentCase,
    assignedCounselor,
    applications,
    activeApplications,
    offers,
    shortlists,
    latestShortlist,
    checklists: activeChecklists,
    openChecklistItems,
    studentActionItems,
    waitingOnSoup,
    referrals,
    payments,
    pendingPayments,
    pendingApplicationFees,
    conciergeActive,
    plusActive,
    counselorSessions,
    nextCounselorSession: counselorSessions.find((session) => session.status === "SCHEDULED") || counselorSessions[0] || null,
    completeness: Math.max(profile.profileCompletenessPct, computedCompleteness),
  };
}

export async function getAdminDashboardData() {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [users, students, documents, applications, offers, openTickets, latestUsers, documentReview, readyToSubmit, waitingForStudent, waitingForUniversity, deadlinesSoon, conciergeCases, recentApplications, sessionRequests] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER", accountStatus: "ACTIVE" } }),
    prisma.document.count(),
    prisma.studentApplication.count(),
    prisma.studentApplication.count({ where: { status: { in: ["OFFER_RECEIVED", "CONDITIONAL_OFFER"] } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { profile: { include: { studentCase: true } } } }),
    prisma.document.count({ where: { reviewStatus: { in: ["PENDING_REVIEW", "MORE_INFO_REQUIRED"] } } }),
    prisma.studentApplication.count({ where: { status: "READY_TO_SUBMIT" } }),
    prisma.studentApplication.count({ where: { status: { in: ["DOCUMENTS_REQUIRED", "SHORTLISTED"] } } }),
    prisma.studentApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.studentApplication.count({ where: { deadlineAt: { gte: now, lte: inSevenDays }, status: { notIn: ["SUBMITTED", "UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED"] } } }),
    prisma.payment.count({ where: { type: "PREMIUM_COUNSELING", status: "PAID", OR: [{ title: "SOUP Concierge" }, { metadata: { path: ["plan"], equals: "premium_plus" } }] } }),
    prisma.studentApplication.findMany({ orderBy: { updatedAt: "desc" }, take: 8, include: { profile: { include: { user: true } }, university: true, program: true } }),
    prisma.counselorSession.count({ where: { status: "REQUESTED" } }),
  ]);

  return { users, students, documents, applications, offers, openTickets, latestUsers, documentReview, readyToSubmit, waitingForStudent, waitingForUniversity, deadlinesSoon, conciergeCases, recentApplications, sessionRequests };
}
