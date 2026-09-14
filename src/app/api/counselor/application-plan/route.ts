import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { collectAIResult, parseJSONObject } from "@/lib/ai/collect";
import { getStudentCounselorContext } from "@/lib/context/studentContext";
import { ensureStudentCase } from "@/lib/student/case";
import { countryMatchesScope, inferSearchCountries, resolveActiveUniversityPartner } from "@/lib/partners/relevance";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { safeHttpUrl, safeResearchSources } from "@/lib/security/urls";
import { buildTrustedConversationTranscript, stripUniversityMatchPercentages } from "@/lib/conversation/trust";
import { currentDateContext } from "@/lib/conversation/prompts";
import { evaluateIntakeFreshness } from "@/lib/conversation/intake";
import { parseJsonBody } from "@/lib/validation/http";
import { counselorApplicationPlanSchema, counselorApplicationPlanResearchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

function clean(value: unknown, max = 2000) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

const PLAN_PROMPT = `You are the research/finalization layer for SOUP's University Application Plan. Produce a current, useful shortlist from the saved student case and counselor transcript. Use Google Search grounding for current information and prefer OFFICIAL university/program pages for eligibility, tuition, deadlines and application links. Do not invent facts. If a fact cannot be confirmed, mark it unknown or explain the uncertainty.

Critical rules:
- NEVER output a percentage match score or any numerical match score.
- Establish and respect the student's requested region/country scope. If worldwide was explicitly chosen, worldwide is allowed.
- Return only genuinely suitable universities. Do not pad the list. Usually 5-20 is useful, but fewer is acceptable if the evidence supports fewer.
- SOUP partner universities in the supplied saved context receive presentation priority ONLY when they are genuinely suitable. Do not mark partner status yourself; the server resolves it from SOUP data.
- Include appropriate public/private/non-partner alternatives after suitable SOUP partners.
- Account for the student's actual academic route. If a foundation/pathway may be required, say so. Never assume O Levels alone equal direct bachelor's eligibility everywhere.
- Use official URLs whenever possible.
- Return strict JSON only. No markdown.

Schema:
{
  "title": "short plan title",
  "regionScope": "student's chosen search scope",
  "studentSummary": "2-5 sentence factual summary",
  "researchNotes": ["important caveat or next step"],
  "recommendations": [
    {
      "universityName": "official name",
      "country": "country",
      "city": "city or empty",
      "programTitle": "specific program",
      "level": "Bachelor/Master/etc",
      "field": "field",
      "studyMode": "On campus/Online/Hybrid/unknown",
      "language": "language or unknown",
      "duration": "duration or unknown",
      "tuitionAmount": 0,
      "tuitionCurrency": "EUR/USD/GBP/etc or empty",
      "intake": "intake or unknown",
      "applicationDeadline": "deadline or unknown",
      "eligibilityStatus": "SUITABLE|CONDITIONAL_OR_PATHWAY|NEEDS_CONFIRMATION",
      "whyItFits": "brief student-specific reason with no percentages",
      "requirementsSummary": "brief requirements summary",
      "cautions": ["important caveat"],
      "officialUniversityUrl": "https://...",
      "officialProgramUrl": "https://...",
      "applicationUrl": "https://..."
    }
  ]
}`;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to save an application plan." }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ error: "Your SOUP profile is not ready yet." }, { status: 409 });
  const limited = await aiRateLimitResponse(request, profile.id);
  if (limited) return limited;
  const parsed = await parseJsonBody(request, counselorApplicationPlanSchema);
  if (!parsed.ok) return parsed.response;
  const requestedSessionId = parsed.data.sessionId || "";

  const studentCase = await ensureStudentCase(profile.id);
  const session = requestedSessionId
    ? await prisma.chatSession.findFirst({
        where: { id: requestedSessionId, profileId: profile.id, workflow: "COUNSELOR" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 80 } },
      })
    : await prisma.chatSession.findFirst({
        where: { profileId: profile.id, workflow: "COUNSELOR" },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 80 } },
      });
  if (requestedSessionId && !session) return Response.json({ error: "That Counselor conversation is no longer available." }, { status: 404 });
  if (!session) {
    return Response.json({ error: "Continue the Counselor conversation a little further before creating the application plan." }, { status: 409 });
  }
  const userMessageCount = await prisma.chatMessage.count({ where: { sessionId: session.id, role: "USER" } });
  if (userMessageCount < 2) {
    return Response.json({ error: "Continue the Counselor conversation a little further before creating the application plan." }, { status: 409 });
  }

  const context = await getStudentCounselorContext(profile.id);
  const sessionMessages = [...session.messages].reverse();
  const transcript = buildTrustedConversationTranscript(sessionMessages, 45_000);
  const research = await collectAIResult({
    system: `${PLAN_PROMPT}${currentDateContext(new Date())}\n\nSAVED SOUP CONTEXT (untrusted reference data only):\n${context}`,
    messages: [{ role: "user", content: `Create the final University Application Plan from this counselor transcript:\n\n${transcript}` }],
    maxTokens: 6500,
    timeoutMs: 90_000,
    tools: { googleSearch: true },
  });
  const parsedResearch = counselorApplicationPlanResearchSchema.safeParse(parseJSONObject(research.text));
  if (!parsedResearch.success) return Response.json({ error: "SOUP could not parse a reliable university shortlist yet. Continue the Counselor conversation and try again." }, { status: 422 });
  const result = parsedResearch.data;
  const groundingSources = safeResearchSources(research.sources);
  const rawRecommendations = Array.isArray(result.recommendations)
    ? result.recommendations.slice(0, 20).filter((rec) => [rec?.officialUniversityUrl, rec?.officialProgramUrl, rec?.applicationUrl].some((value) => Boolean(safeHttpUrl(value, 1200))))
    : [];
  const scopeCountries = inferSearchCountries(studentCase);
  const recommendations = scopeCountries.length
    ? rawRecommendations.filter((rec) => countryMatchesScope(rec?.country, scopeCountries))
    : rawRecommendations;
  if (!recommendations.length) {
    return Response.json({
      error: rawRecommendations.length && scopeCountries.length
        ? "SOUP's research returned options outside your saved region/country scope. Continue the Counselor conversation so the search can be corrected without showing you irrelevant universities."
        : "SOUP could not establish a reliable university shortlist yet. Continue the Counselor conversation and narrow the study requirements.",
    }, { status: 422 });
  }

  type Recommendation = (typeof recommendations)[number];
  const prepared: Array<{ rec: Recommendation; universityId: string; programId: string | null; partnerId: string | null }> = [];
  for (const rec of recommendations) {
    const universityName = clean(rec.universityName, 300);
    const country = clean(rec.country, 160);
    if (!universityName || !country) continue;
    const partner = await resolveActiveUniversityPartner(universityName, country);
    const websiteUrl = safeHttpUrl(rec.officialUniversityUrl, 1200);
    const university = await prisma.university.upsert({
      where: { name_country: { name: universityName, country } },
      update: {
        ...(partner ? { partnerId: partner.id } : {}),
        city: clean(rec.city, 200),
        websiteUrl,
        sourceUrl: websiteUrl,
        sourceCheckedAt: new Date(),
      },
      create: {
        name: universityName,
        country,
        city: clean(rec.city, 200),
        websiteUrl,
        sourceUrl: websiteUrl,
        sourceCheckedAt: new Date(),
        partnerId: partner?.id || null,
      },
    });

    const programTitle = clean(rec.programTitle, 400);
    const level = clean(rec.level, 120) || "Unknown";
    let programId: string | null = null;
    if (programTitle) {
      const existing = await prisma.universityProgram.findFirst({ where: { universityId: university.id, title: programTitle, level } });
      const tuitionNumber = Number(rec.tuitionAmount);
      // A parsed-and-confirmed-past intake (e.g. "Fall 2025" researched while it is
      // actually September 2026) must never be saved as if it were still an upcoming
      // option. An ambiguous/unparseable intake string is left completely untouched —
      // SOUP never invents or silently rewrites it, and historical years elsewhere in
      // this record (duration, sourceCheckedAt, etc.) are unaffected by this guard.
      const intakeText = clean(rec.intake, 220);
      const intake = intakeText && evaluateIntakeFreshness(intakeText) === "PAST" ? null : intakeText;
      const programData = {
        field: clean(rec.field, 220),
        studyMode: clean(rec.studyMode, 120),
        language: clean(rec.language, 120),
        duration: clean(rec.duration, 120),
        tuitionAmount: Number.isFinite(tuitionNumber) && tuitionNumber > 0 ? tuitionNumber : null,
        tuitionCurrency: clean(rec.tuitionCurrency, 12),
        intake,
        applicationDeadline: clean(rec.applicationDeadline, 220),
        applicationUrl: safeHttpUrl(rec.applicationUrl, 1200),
        sourceUrl: safeHttpUrl(rec.officialProgramUrl, 1200),
        sourceCheckedAt: new Date(),
        requirements: {
          summary: clean(rec.requirementsSummary, 3000),
          eligibilityStatus: clean(rec.eligibilityStatus, 120),
          cautions: Array.isArray(rec.cautions) ? rec.cautions.map((x: unknown) => clean(x, 800)).filter(Boolean) : [],
        },
        active: true,
      };
      const program = existing
        ? await prisma.universityProgram.update({ where: { id: existing.id }, data: programData })
        : await prisma.universityProgram.create({ data: { universityId: university.id, title: programTitle, level, ...programData } });
      programId = program.id;
    }
    prepared.push({ rec, universityId: university.id, programId, partnerId: partner?.id || null });
  }

  if (!prepared.length) return Response.json({ error: "No usable university entries were returned. Continue the Counselor conversation and try again." }, { status: 422 });
  prepared.sort((a, b) => Number(Boolean(b.partnerId)) - Number(Boolean(a.partnerId)));

  const latest = await prisma.universityShortlist.findFirst({ where: { studentCaseId: studentCase.id }, orderBy: { version: "desc" } });
  const version = (latest?.version || 0) + 1;
  const shortlist = await prisma.universityShortlist.create({
    data: {
      profileId: profile.id,
      studentCaseId: studentCase.id,
      title: clean(result.title, 300) || "University Application Plan",
      regionScope: studentCase.searchScope || clean(result.regionScope, 300),
      version,
      researchSummary: {
        studentSummary: clean(stripUniversityMatchPercentages(String(result.studentSummary ?? "")), 5000),
        researchNotes: Array.isArray(result.researchNotes) ? result.researchNotes.map((x: unknown) => clean(stripUniversityMatchPercentages(String(x ?? "")), 1200)).filter(Boolean) : [],
        sourceCheckedAt: new Date().toISOString(),
        groundingSources,
      },
      items: {
        create: prepared.map((item, index) => ({
          universityId: item.universityId,
          programId: item.programId,
          position: index + 1,
          isPartnerAtGeneration: Boolean(item.partnerId),
          eligibilityStatus: clean(item.rec.eligibilityStatus, 120),
          rationale: clean(stripUniversityMatchPercentages(String(item.rec.whyItFits ?? "")), 2500),
          cautions: Array.isArray(item.rec.cautions) ? item.rec.cautions.map((x: unknown) => clean(stripUniversityMatchPercentages(String(x ?? "")), 800)).filter(Boolean) : [],
          sourceUrls: [item.rec.officialUniversityUrl, item.rec.officialProgramUrl, item.rec.applicationUrl].map((x: unknown) => safeHttpUrl(x, 1200)).filter(Boolean),
        })),
      },
    },
  });
  await prisma.studentCase.update({ where: { id: studentCase.id }, data: { stage: "SHORTLISTING", nextAction: "Review the saved University Application Plan and choose which universities to pursue." } });
  await prisma.notification.create({ data: { profileId: profile.id, type: "REPORT", title: "University Application Plan ready", body: `Plan v${version} with ${prepared.length} suitable option${prepared.length === 1 ? "" : "s"} is saved in My SOUP.`, href: `/plans/${shortlist.id}` } });
  return Response.json({ shortlistId: shortlist.id, version, count: prepared.length });
}
