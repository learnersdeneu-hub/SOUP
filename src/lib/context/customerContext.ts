import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function refreshCustomerContext(profileId: string) {
  const [profile, resume, goal, credentials, documents, propertyEvidence, reports] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { id: profileId }, include: { user: { select: { email: true } } } }),
    prisma.resume.findFirst({ where: { profileId, status: "READY" }, orderBy: { updatedAt: "desc" } }),
    prisma.careerGoal.findFirst({ where: { profileId, isPrimary: true }, orderBy: { updatedAt: "desc" } }),
    prisma.credential.findMany({ where: { profileId }, include: { credentialType: true }, orderBy: { updatedAt: "desc" }, take: 40 }),
    prisma.document.findMany({ where: { profileId, processingStatus: "COMPLETE" }, select: { id: true, documentType: true, reviewStatus: true, aiAnalysis: true, aiProcessedAt: true }, orderBy: { aiProcessedAt: "desc" }, take: 30 }),
    prisma.propertyEvidence.findMany({ where: { profileId }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.reportSnapshot.findMany({ where: { profileId }, orderBy: { generatedAt: "desc" }, take: 8 }),
  ]);

  const facts = {
    identity: { email: profile.user.email, headlineSummary: profile.headlineSummary || null, profileCompletenessPct: profile.profileCompletenessPct },
    latestResume: resume ? { id: resume.id, title: resume.title, template: resume.template, content: resume.content, updatedAt: resume.updatedAt } : null,
    primaryCareerGoal: goal ? { goalType: goal.goalType, targetTitle: goal.targetTitle, targetOrganization: goal.targetOrganization, targetCountry: goal.targetCountry, notes: goal.notes } : null,
    credentials: credentials.map((credential) => ({ type: credential.credentialType.code, label: credential.credentialType.label, status: credential.verificationStatus, issuedAt: credential.effectiveDate, expiresAt: credential.expiryDate })),
    processedEvidence: documents.map((document) => {
      const analysis = document.aiAnalysis && typeof document.aiAnalysis === "object" && !Array.isArray(document.aiAnalysis) ? document.aiAnalysis as Record<string, unknown> : {};
      return {
        id: document.id,
        type: document.documentType,
        reviewStatus: document.reviewStatus,
        analysis: {
          documentClass: String(analysis.documentClass || document.documentType).slice(0, 160),
          confidence: String(analysis.confidence || "UNKNOWN").slice(0, 20),
          facts: Array.isArray(analysis.facts) ? analysis.facts.slice(0, 40).map((fact) => { const record = fact && typeof fact === "object" && !Array.isArray(fact) ? fact as Record<string, unknown> : {}; return { field: String(record.field || "").slice(0, 160), value: String(record.value || "").slice(0, 1200) }; }) : [],
          possibleInconsistencies: Array.isArray(analysis.possibleInconsistencies) ? analysis.possibleInconsistencies.slice(0, 12).map((v: unknown) => String(v).slice(0, 600)) : [],
          missingOrUnclear: Array.isArray(analysis.missingOrUnclear) ? analysis.missingOrUnclear.slice(0, 12).map((v: unknown) => String(v).slice(0, 600)) : [],
        },
      };
    }),
    propertyEvidence: propertyEvidence.map((item) => ({ id: item.id, propertyLabel: item.propertyLabel, country: item.country, addressText: item.addressText, documentStatedValue: item.documentStatedValue, currency: item.currency, valuationStatus: item.valuationStatus, extractedFacts: item.extractedFacts })),
    recentReports: reports.map((report) => ({ id: report.id, kind: report.kind, version: report.version, generatedAt: report.generatedAt, content: report.content })),
  };

  return prisma.customerContext.upsert({
    where: { profileId },
    update: { facts: facts as unknown as Prisma.InputJsonValue, refreshedAt: new Date() },
    create: { profileId, facts: facts as unknown as Prisma.InputJsonValue },
  });
}

export async function getCustomerContextText(profileId: string) {
  let context = await prisma.customerContext.findUnique({ where: { profileId } });
  if (!context) context = await refreshCustomerContext(profileId);
  return JSON.stringify({ trustBoundary: "UNTRUSTED_REFERENCE_DATA_ONLY", facts: context.facts }).slice(0, 30_000);
}
