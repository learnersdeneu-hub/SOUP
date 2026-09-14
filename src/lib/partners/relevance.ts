import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type StudentCaseLike = {
  targetDegreeLevel?: string | null;
  targetSubject?: string | null;
  searchScope?: string | null;
  preferredCountries?: unknown;
  preferredRegions?: unknown;
} | null;

const REGION_COUNTRIES: Record<string, string[]> = {
  europe: ["Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal","Romania","San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom"],
  "european union": ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden"],
  eu: ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden"],
  schengen: ["Austria","Belgium","Bulgaria","Croatia","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Italy","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Netherlands","Norway","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden","Switzerland"],
  "united kingdom": ["United Kingdom"],
  uk: ["United Kingdom"],
  "north america": ["United States","Canada","Mexico"],
  "usa and canada": ["United States","Canada"],
  "australia and new zealand": ["Australia","New Zealand"],
  oceania: ["Australia","New Zealand"],
  "middle east": ["United Arab Emirates","Saudi Arabia","Qatar","Bahrain","Oman","Kuwait","Jordan","Turkey"],
  gcc: ["United Arab Emirates","Saudi Arabia","Qatar","Bahrain","Oman","Kuwait"],
  gulf: ["United Arab Emirates","Saudi Arabia","Qatar","Bahrain","Oman","Kuwait"],
  asia: ["China","Hong Kong","India","Indonesia","Japan","Malaysia","Pakistan","Singapore","South Korea","Taiwan","Thailand","Vietnam"],
  "southeast asia": ["Brunei","Cambodia","Indonesia","Laos","Malaysia","Myanmar","Philippines","Singapore","Thailand","Vietnam"],
};

const COUNTRY_EQUIVALENTS: string[][] = [
  ["United Kingdom", "UK", "Great Britain"],
  ["United States", "USA", "US", "United States of America"],
  ["United Arab Emirates", "UAE"],
  ["South Korea", "Republic of Korea", "Korea South"],
  ["Czech Republic", "Czechia"],
  ["Turkey", "Türkiye", "Turkiye"],
];


function normalizedCountry(value: unknown) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function expandCountryEquivalents(values: string[]) {
  const expanded: string[] = [];
  for (const value of values) {
    const normalized = normalizedCountry(value);
    const group = COUNTRY_EQUIVALENTS.find((candidate) => candidate.some((alias) => normalizedCountry(alias) === normalized));
    expanded.push(...(group || [value]));
  }
  return [...new Set(expanded.map((value) => value.trim()).filter(Boolean))];
}

export function countryMatchesScope(country: unknown, scopeCountries: string[]) {
  const normalized = normalizedCountry(country);
  if (!normalized) return false;
  return expandCountryEquivalents(scopeCountries).some((candidate) => normalizedCountry(candidate) === normalized);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function normalizeInstitutionName(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferSearchCountries(studentCase: StudentCaseLike) {
  const explicit = stringArray(studentCase?.preferredCountries);
  if (explicit.length) return expandCountryEquivalents(explicit).slice(0, 80);
  const regionValues = [studentCase?.searchScope, ...stringArray(studentCase?.preferredRegions)].map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);
  const knownCountries = [...new Set(Object.values(REGION_COUNTRIES).flat())];
  const countries = regionValues.flatMap((region) => {
    if (REGION_COUNTRIES[region]) return REGION_COUNTRIES[region];
    const matched = Object.entries(REGION_COUNTRIES).find(([key]) => region.includes(key));
    if (matched) return matched[1];
    const exactCountry = expandCountryEquivalents(knownCountries).find((country) => normalizedCountry(country) === normalizedCountry(region));
    return exactCountry ? [exactCountry] : [];
  });
  return expandCountryEquivalents(countries).slice(0, 80);
}

function academicProgramWhere(subject: string, degree: string): Prisma.UniversityProgramWhereInput {
  const where: Prisma.UniversityProgramWhereInput = {};
  if (subject) where.OR = [
    { field: { contains: subject, mode: "insensitive" } },
    { title: { contains: subject, mode: "insensitive" } },
  ];
  if (degree) where.level = { contains: degree, mode: "insensitive" };
  return where;
}

export async function getRelevantUniversityPartners(studentCase: StudentCaseLike, limit = 60) {
  const countries = inferSearchCountries(studentCase);
  const subject = String(studentCase?.targetSubject || "").trim();
  const degree = String(studentCase?.targetDegreeLevel || "").trim();
  const programWhere = academicProgramWhere(subject, degree);
  const hasAcademicFilter = Boolean(subject || degree);

  // Geography, subject and degree-level are independent constraints and therefore
  // combine as AND conditions. Within the subject constraint, title OR field may match.
  // This prevents a university from receiving partner priority merely because it
  // offers an unrelated program at the requested degree level.
  const universityWhere: Prisma.UniversityWhereInput = {
    ...(countries.length ? { country: { in: countries, mode: "insensitive" } } : {}),
    ...(hasAcademicFilter ? { programs: { some: programWhere } } : {}),
  };
  const hasUniversityFilter = countries.length > 0 || hasAcademicFilter;

  return prisma.partner.findMany({
    where: {
      type: "UNIVERSITY",
      status: "ACTIVE",
      ...(hasUniversityFilter ? { universities: { some: universityWhere } } : {}),
    },
    orderBy: [{ internalPriority: "asc" }, { name: "asc" }],
    take: limit,
    // No internal database id is selected anywhere here (partner, university,
    // or program): this result is only ever used to build the AI's saved
    // context JSON, and a raw id has previously leaked verbatim into a
    // visible reply because nothing stops the model from echoing back a
    // field it was given.
    select: {
      name: true,
      country: true,
      city: true,
      websiteUrl: true,
      publicMetadata: true,
      universities: {
        where: hasUniversityFilter ? universityWhere : undefined,
        take: 8,
        select: {
          name: true,
          country: true,
          city: true,
          websiteUrl: true,
          programs: {
            where: hasAcademicFilter ? programWhere : undefined,
            take: 4,
            select: { title: true, level: true, field: true, tuitionAmount: true, tuitionCurrency: true, intake: true, sourceUrl: true, applicationUrl: true },
          },
        },
      },
    },
  });
}

export async function getActiveServicePartners() {
  return prisma.partner.findMany({
    where: { status: "ACTIVE", type: { not: "UNIVERSITY" } },
    orderBy: [{ internalPriority: "asc" }, { name: "asc" }],
    take: 80,
    select: { type: true, name: true, country: true, city: true, websiteUrl: true, transactionUrl: true, publicMetadata: true },
  });
}

export async function resolveActiveUniversityPartner(universityName: string, country?: string | null) {
  const university = await prisma.university.findFirst({
    where: {
      name: { equals: universityName, mode: "insensitive" },
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
      partner: { is: { type: "UNIVERSITY", status: "ACTIVE" } },
    },
    include: { partner: true },
  });
  if (university?.partner) return university.partner;

  // AI/live-research output can differ only in punctuation (for example '&'
  // versus 'and'). Resolve those harmless formatting differences against the
  // server-owned university catalogue before falling back to the partner name.
  const catalogCandidates = await prisma.university.findMany({
    where: {
      partner: { is: { type: "UNIVERSITY", status: "ACTIVE" } },
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
    },
    include: { partner: true },
    take: 250,
  });
  const normalizedTarget = normalizeInstitutionName(universityName);
  const catalogMatch = catalogCandidates.find((candidate) => normalizeInstitutionName(candidate.name) === normalizedTarget);
  if (catalogMatch?.partner) return catalogMatch.partner;

  const partner = await prisma.partner.findFirst({
    where: { type: "UNIVERSITY", status: "ACTIVE", name: { equals: universityName, mode: "insensitive" } },
    orderBy: { internalPriority: "asc" },
  });
  if (partner) return partner;

  const partnerCandidates = await prisma.partner.findMany({
    where: { type: "UNIVERSITY", status: "ACTIVE", ...(country ? { country: { equals: country, mode: "insensitive" } } : {}) },
    orderBy: { internalPriority: "asc" },
    take: 250,
  });
  return partnerCandidates.find((candidate) => normalizeInstitutionName(candidate.name) === normalizedTarget) || null;
}
