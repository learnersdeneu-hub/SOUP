import { prisma } from "@/lib/prisma";
import { evaluateIntakeFreshness } from "@/lib/conversation/intake";

const STAGES = new Set([
  "EXPLORING",
  "SHORTLISTING",
  "APPLYING",
  "AWAITING_DECISIONS",
  "OFFER_RECEIVED",
  "VISA_PREPARATION",
  "PRE_DEPARTURE",
  "ARRIVED",
]);

function clean(value: string | undefined, max = 500) {
  const next = String(value || "").trim();
  return next ? next.slice(0, max) : undefined;
}

export async function ensureStudentCase(profileId: string) {
  return prisma.studentCase.upsert({
    where: { profileId },
    update: {},
    create: { profileId },
  });
}

export async function applyCaseUpdateToken(profileId: string, assistantText: string) {
  const matches = [...assistantText.matchAll(/\[\[CASE_UPDATE\|([^\]]+)\]\]/g)];
  if (!matches.length) return null;
  const payload = matches[matches.length - 1]?.[1] || "";
  const fields = Object.fromEntries(
    payload.split("|").map((part) => {
      const i = part.indexOf("=");
      return i > 0 ? [part.slice(0, i).trim(), part.slice(i + 1).trim()] : [part.trim(), ""];
    }),
  );

  const data: Record<string, unknown> = {};
  const degree = clean(fields.degree); if (degree) data.targetDegreeLevel = degree;
  const subject = clean(fields.subject); if (subject) data.targetSubject = subject;
  // A confirmed-past intake (e.g. "Fall 2025" saved while it is actually September
  // 2026) must never be recorded as the student's preferred/upcoming intake, since it
  // would keep getting fed back to Noodles as saved fact in later turns. An
  // ambiguous/unparseable intake is left completely untouched rather than invented or
  // rewritten, and this guard applies only to this field — not to academic history,
  // date of birth, or any other genuinely historical fact elsewhere in the case.
  const intake = clean(fields.intake); if (intake && evaluateIntakeFreshness(intake) !== "PAST") data.preferredIntake = intake;
  const region = clean(fields.region); if (region) { data.searchScope = region; data.preferredRegions = [region]; }
  const countries = clean(fields.countries, 1000); if (countries) data.preferredCountries = countries.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);
  const academic = clean(fields.academic, 2000); if (academic) data.academicBackgroundSummary = academic;
  const english = clean(fields.english, 1000); if (english) data.englishProficiencySummary = english;
  const funding = clean(fields.funding, 1000); if (funding) data.fundingSummary = funding;
  const currency = clean(fields.currency, 12); if (currency) data.budgetCurrency = currency.toUpperCase();
  if (fields.budgetMax) {
    const n = Number(String(fields.budgetMax).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n >= 0) data.budgetMax = n;
  }
  const stage = clean(fields.stage, 40)?.toUpperCase(); if (stage && STAGES.has(stage)) data.stage = stage;

  const userData: Record<string, unknown> = {};
  const fullName = clean(fields.fullName, 180); if (fullName) userData.fullName = fullName;
  const nationality = clean(fields.nationality, 120); if (nationality) userData.nationality = nationality;
  const currentCountry = clean(fields.currentCountry, 120); if (currentCountry) userData.currentCountry = currentCountry;
  const dob = clean(fields.dob, 40);
  if (dob) {
    const parsed = new Date(dob);
    if (!Number.isNaN(parsed.getTime())) userData.dateOfBirth = parsed;
  }
  if (!Object.keys(data).length && !Object.keys(userData).length) return null;

  return prisma.$transaction(async (tx) => {
    const studentCase = await tx.studentCase.upsert({
      where: { profileId },
      update: data,
      create: { profileId, ...data },
    });
    if (Object.keys(userData).length) {
      const profile = await tx.profile.findUnique({ where: { id: profileId }, select: { userId: true } });
      if (profile) await tx.user.update({ where: { id: profile.userId }, data: userData });
    }
    return studentCase;
  });
}
