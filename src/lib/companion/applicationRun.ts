import { prisma } from "@/lib/prisma";
import type { StudentApplicationStatus } from "@prisma/client";
import { collectAIResult, parseJSONObject } from "@/lib/ai/collect";
import { safeHttpUrl } from "@/lib/security/urls";

export type RunnableApplication = {
  id: string;
  universityName: string;
  programTitle: string | null;
  status: string;
};

// Applications a "Start applications" run is allowed to pick up: the
// student's own, SOUP is actually allowed to touch them (SOUP_MANAGED —
// never a STUDENT_MANAGED_EXTERNAL/ASSISTED_EXTERNAL row the student is
// tracking by hand), and not already past the point a fill run means
// anything (submitted/decided/withdrawn).
const RUNNABLE_STATUSES: StudentApplicationStatus[] = ["SHORTLISTED", "DOCUMENTS_REQUIRED", "READY_TO_SUBMIT"];

export async function listRunnableApplications(profileId: string): Promise<RunnableApplication[]> {
  const applications = await prisma.studentApplication.findMany({
    where: { profileId, ownership: "SOUP_MANAGED", status: { in: RUNNABLE_STATUSES } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, university: { select: { name: true } }, program: { select: { title: true } } },
  });
  return applications
    .filter((a) => a.university)
    .map((a) => ({ id: a.id, universityName: a.university!.name, programTitle: a.program?.title || null, status: a.status }));
}

export type ChecklistSummary = {
  items: Array<{ id: string; title: string; required: boolean; status: string }>;
  incompleteRequiredCount: number;
};

const COMPLETE_STATUSES = new Set(["COMPLETE", "NOT_APPLICABLE"]);

export async function getChecklistSummary(applicationId: string): Promise<ChecklistSummary> {
  const items = await prisma.journeyChecklistItem.findMany({
    where: { checklist: { applicationId, kind: "ADMISSION" } },
    orderBy: { position: "asc" },
    select: { id: true, title: true, required: true, status: true },
  });
  const incompleteRequiredCount = items.filter((item) => item.required && !COMPLETE_STATUSES.has(item.status)).length;
  return { items, incompleteRequiredCount };
}

const URL_LOOKUP_PROMPT = `You find the correct, current, official online application portal for a specific university program. Use Google Search grounding. Prefer the university's own official domain. Never invent a URL — if you cannot confirm one with real search results, say so.

Return strict JSON only, no markdown:
{ "url": "https://... or null", "confidence": "HIGH" | "LOW" }

confidence is HIGH only when the URL is clearly the official application start page for this exact program (not just the university's general homepage). Otherwise LOW, or null url if nothing reliable was found.`;

// Fallback used only when SOUP has no application URL on file yet
// (neither StudentApplication.externalApplicationUrl nor
// UniversityProgram.applicationUrl) — reuses the same Google-grounded,
// official-source-only pattern already used by
// src/app/api/counselor/application-plan/route.ts, just scoped to one
// program instead of a whole shortlist. A HIGH-confidence result is
// cached back onto the program row so the lookup never has to run twice
// for the same program.
export async function findOfficialApplicationUrl(input: { universityName: string; country: string | null; programTitle: string | null; programId: string | null }): Promise<{ url: string | null; confidence: "HIGH" | "LOW" }> {
  try {
    const result = await collectAIResult({
      system: URL_LOOKUP_PROMPT,
      messages: [{
        role: "user",
        content: `University: ${input.universityName}${input.country ? ` (${input.country})` : ""}\nProgram: ${input.programTitle || "unspecified program"}\n\nFind the official application portal URL.`,
      }],
      maxTokens: 400,
      timeoutMs: 30_000,
      tools: { googleSearch: true },
    });
    const parsed = parseJSONObject(result.text) as { url?: unknown; confidence?: unknown };
    const url = safeHttpUrl(parsed.url, 1200);
    const confidence = String(parsed.confidence || "").toUpperCase() === "HIGH" ? "HIGH" as const : "LOW" as const;
    if (url && confidence === "HIGH" && input.programId) {
      await prisma.universityProgram.update({ where: { id: input.programId }, data: { applicationUrl: url, sourceCheckedAt: new Date() } }).catch(() => undefined);
    }
    return { url, confidence };
  } catch {
    return { url: null, confidence: "LOW" };
  }
}

export type QueueItem = {
  applicationId: string;
  universityName: string;
  programTitle: string | null;
  targetUrl: string | null;
  targetUrlConfidence: "KNOWN" | "HIGH" | "LOW" | "NONE";
  checklist: ChecklistSummary;
};

// Resolves each application in the requested order into everything the
// desktop run needs: where to actually go, and what SOUP already knows
// this application requires. Caller (the API route) is responsible for
// verifying every id actually belongs to the requesting profile first.
export async function buildApplicationQueue(applicationIds: string[]): Promise<QueueItem[]> {
  const applications = await prisma.studentApplication.findMany({
    where: { id: { in: applicationIds } },
    select: {
      id: true,
      externalApplicationUrl: true,
      university: { select: { name: true, country: true, websiteUrl: true } },
      program: { select: { id: true, title: true, applicationUrl: true } },
    },
  });
  const byId = new Map(applications.map((a) => [a.id, a]));

  const items: QueueItem[] = [];
  for (const applicationId of applicationIds) {
    const application = byId.get(applicationId);
    if (!application || !application.university) continue;

    const checklist = await getChecklistSummary(applicationId);
    const known = safeHttpUrl(application.externalApplicationUrl) || safeHttpUrl(application.program?.applicationUrl);
    if (known) {
      items.push({ applicationId, universityName: application.university.name, programTitle: application.program?.title || null, targetUrl: known, targetUrlConfidence: "KNOWN", checklist });
      continue;
    }

    const lookup = await findOfficialApplicationUrl({
      universityName: application.university.name,
      country: application.university.country,
      programTitle: application.program?.title || null,
      programId: application.program?.id || null,
    });
    const fallback = lookup.url || safeHttpUrl(application.university.websiteUrl);
    items.push({
      applicationId,
      universityName: application.university.name,
      programTitle: application.program?.title || null,
      targetUrl: fallback,
      targetUrlConfidence: lookup.url ? lookup.confidence : fallback ? "LOW" : "NONE",
      checklist,
    });
  }
  return items;
}
