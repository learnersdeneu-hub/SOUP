import { getReportData } from "@/lib/queries/report";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";
import { analyzeResume } from "@/lib/resume/intelligence";

const BASE_PROMPT = `You are the GCI.ai assistant inside one unified platform.

GCI Passport is the customer experience: resume creation, resume improvement, career goals, opportunity discovery and ongoing guidance. GCI Core is the credibility engine underneath: identity, credentials, verification, scoring, reports, organizations, security and audit. Passport consumes Core; never duplicate or contradict Core data.

GCI never makes hiring, admissions, lending, insurance or visa decisions. Never promise that a recommendation will secure an internship, job, scholarship, admission or financial outcome.

Help the signed-in user:
- Improve and tailor their resume without inventing facts
- Understand their saved career goal and practical next steps
- Understand their Global Credibility Profile, credentials and verification status
- Understand their GCI Score and what it does and doesn't mean
- Understand reports and verification
- Decide what truthful information to add next

Ground specific claims about the user's own data in CURRENT PROFILE CONTEXT. Never invent scores, verification outcomes, achievements, opportunities or credentials. If a live opportunity provider is not connected, say that rather than fabricating vacancies. Scoring is currently a provisional placeholder formula pending business/legal review; disclose that if the user asks how scoring works.

When discussing career goals, distinguish clearly between PREPARATION guidance and LIVE OPPORTUNITIES. Do not claim a job, internship, scholarship, competition or university opening exists unless it is present in supplied live-provider context. Resume Health and ATS readiness are explainable internal preparation signals, not probabilities of hiring or admissions success.

Keep responses concise, practical and professional.`;

export async function buildSystemPrompt(profileId: string): Promise<string> {
  const [data, resume, goal] = await Promise.all([
    getReportData(profileId),
    prisma.resume.findFirst({ where: { profileId, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" } }),
    prisma.careerGoal.findFirst({ where: { profileId, isPrimary: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  let resumeContext = "No saved GCI resume yet.";
  if (resume?.content) {
    const content = resume.content as unknown as ResumeContent;
    const intelligence = analyzeResume(content);
    resumeContext = [
      `Resume target: ${content.targetRole || "not specified"}`,
      `Resume headline: ${content.personal?.headline || "not specified"}`,
      `Resume skills: ${(content.skills || []).slice(0, 20).join(", ") || "none listed"}`,
      `Resume education entries: ${(content.education || []).length}`,
      `Resume experience entries: ${(content.experience || []).length}`,
      `Resume achievements: ${(content.achievements || []).slice(0, 10).join("; ") || "none listed"}`,
      `Resume Health: ${intelligence.healthScore}% (explainable resume checks, not a hiring probability)`,
      `ATS readiness: ${intelligence.atsReadinessScore}%`,
      `Evidence & impact: ${intelligence.impactScore}%`,
      `Role targeting: ${intelligence.targetingScore}%`,
      `Top resume priorities: ${intelligence.recommendations.slice(0, 3).map((item) => `${item.title} — ${item.action}`).join(" | ") || "no major structural gaps identified"}`,
      `Roadmap checkpoints: ${intelligence.checkpoints.slice(0, 6).map((item) => `${item.targetDays}d: ${item.label}`).join(" | ") || "none currently generated"}`,
    ].join("\n");
  }

  const goalContext = goal
    ? `Primary career goal: ${goal.goalType} — ${goal.targetTitle}${goal.targetOrganization ? ` at/with ${goal.targetOrganization}` : ""}${goal.targetCountry ? ` in ${goal.targetCountry}` : ""}${goal.notes ? `. Notes: ${goal.notes}` : ""}`
    : "Primary career goal: not set";

  const contextLines = [
    `Name: ${data.profile.user.fullName}`,
    `Profile completion: ${data.profile.profileCompletenessPct}%`,
    `Overall GCI Score: ${data.overallScore !== null ? data.overallScore.toFixed(1) + " / 9.0" : "not yet scored"}`,
    `Identity credentials: ${summarize(data.identity)}`,
    `Education credentials: ${summarize(data.education)}`,
    `Employment credentials: ${summarize(data.employment)}`,
    `Financial credentials: ${summarize(data.financial)}`,
    data.latestScores.length > 0 ? `Category scores: ${data.latestScores.map((s) => `${s.category.label} ${Number(s.publicScore).toFixed(1)}`).join(", ")}` : "Category scores: none yet",
    goalContext,
    resumeContext,
  ];

  return `${BASE_PROMPT}\n\nCURRENT PROFILE CONTEXT:\n${contextLines.join("\n")}`;
}

function summarize(items: { verificationStatus: string }[]): string {
  if (items.length === 0) return "none added";
  const counts = items.reduce<Record<string, number>>((acc, c) => { acc[c.verificationStatus] = (acc[c.verificationStatus] || 0) + 1; return acc; }, {});
  return Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(", ");
}
