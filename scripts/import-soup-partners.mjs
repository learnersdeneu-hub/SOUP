import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const file = path.resolve(process.cwd(), "data/replit-partnered-university-programs.csv");

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(value); value = ""; }
    else if (ch === '\n') { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += ch;
  }
  if (value.length || row.length) { row.push(value); rows.push(row); }
  const header = rows.shift()?.map((x) => x.replace(/^\uFEFF/, "").trim()) || [];
  return rows.map((cells) => Object.fromEntries(header.map((h, i) => [h, String(cells[i] || "").trim()])));
}

const countries = new Map(Object.entries({
  "University of Debrecen": "Hungary",
  "International Business School Budapest": "Hungary",
  "Wekerle Business School": "Hungary",
  "New European College": "Germany",
  "Berlin School of Business and Innovation": "Germany",
  "Arden University": "United Kingdom",
  "GISMA University for Applied Sciences": "Germany",
  "KEDGE Business School": "France",
  "ESDES University": "France",
  "Paris Business School": "France",
  "Higher Institute of Economics & Innovation WSEI Poland": "Poland",
  "Collegium Da Vinci Poland": "Poland",
  "International European University Poland": "Poland",
  "Singidunum University Serbia": "Serbia",
  "DOBA Business School Slovenia": "Slovenia",
  "Algebra University College Croatia": "Croatia",
}));

function numberOrNull(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const embeddedHeaders = rows.filter((row) => row["University Name"] === "University Name").length;
  const missingCoreFields = rows.filter((row) => row["University Name"] !== "University Name" && (!row["University Name"] || !row["Programe/Course"])).length;
  const useful = rows.filter((row) => row["University Name"] && row["Programe/Course"] && row["University Name"] !== "University Name");
  const grouped = new Map();
  const unknownUniversities = new Set();
  for (const row of useful) {
    const universityName = row["University Name"].replace(/\u00a0/g, " ").trim();
    if (!countries.has(universityName)) {
      unknownUniversities.add(universityName);
      continue;
    }
    if (!grouped.has(universityName)) grouped.set(universityName, []);
    grouped.get(universityName).push(row);
  }

  let universities = 0, programs = 0;
  for (const [name, programRows] of grouped) {
    const country = countries.get(name);
    const city = programRows.find((row) => row.City)?.City || null;
    const partner = await prisma.partner.upsert({
      where: { slug: `university-${slugify(name)}` },
      update: { name, type: "UNIVERSITY", status: "ACTIVE", country, city },
      create: {
        type: "UNIVERSITY",
        name,
        slug: `university-${slugify(name)}`,
        status: "ACTIVE",
        country,
        city,
        internalPriority: 50,
        publicMetadata: { source: "SOUP Replit partner dataset" },
      },
    });
    const university = await prisma.university.upsert({
      where: { name_country: { name, country } },
      update: { partnerId: partner.id, city },
      create: { partnerId: partner.id, name, country, city, publicMetadata: { source: "SOUP Replit partner dataset" } },
    });
    universities++;

    for (const row of programRows) {
      const title = row["Programe/Course"].trim();
      const rawLevel = row.Level?.trim() || "Unknown";
      const level = /^ba/i.test(rawLevel) ? "Bachelors" : rawLevel;
      const existing = await prisma.universityProgram.findFirst({ where: { universityId: university.id, title, level } });
      const data = {
        field: row.Category?.trim() || null,
        duration: row["Programme Duration"]?.trim() || null,
        tuitionAmount: numberOrNull(row["Tuition Fee/Per Year in EUR for Non-EU students"]),
        tuitionCurrency: "EUR",
        applicationDeadline: row.Deadline?.trim() || null,
        requirements: { accommodationAvailable: /^yes$/i.test(row.Accomodation || "") },
        active: true,
      };
      if (existing) await prisma.universityProgram.update({ where: { id: existing.id }, data });
      else await prisma.universityProgram.create({ data: { universityId: university.id, title, level, ...data } });
      programs++;
    }
  }

  await prisma.partner.upsert({
    where: { slug: "hellenic-sun-insuremart" },
    update: { type: "INSURANCE", status: "ACTIVE", name: "Hellenic Sun Insurance Brokers / insuremart", country: "Pakistan", city: "Lahore", websiteUrl: "https://insuremart.pk/", transactionUrl: "https://insuremart.pk/" },
    create: {
      type: "INSURANCE",
      name: "Hellenic Sun Insurance Brokers / insuremart",
      slug: "hellenic-sun-insuremart",
      status: "ACTIVE",
      country: "Pakistan",
      city: "Lahore",
      websiteUrl: "https://insuremart.pk/",
      transactionUrl: "https://insuremart.pk/",
      internalPriority: 1,
      publicMetadata: { role: "SOUP insurance transaction channel", transactionMode: "DIRECTORY_REDIRECT" },
      commercialMetadata: { exclusiveSoupTransactionChannelAtLaunch: true },
    },
  });


  await prisma.partner.upsert({
    where: { slug: 'mcb-islamic-bank' },
    update: { type: 'STUDENT_FINANCE', status: 'ACTIVE', name: 'MCB Islamic Bank', country: 'Pakistan', websiteUrl: 'https://www.mcbislamicbank.com/', transactionUrl: 'https://www.mcbislamicbank.com/', internalPriority: 2, publicMetadata: { role: 'SOUP banking partner' } },
    create: { type: 'STUDENT_FINANCE', name: 'MCB Islamic Bank', slug: 'mcb-islamic-bank', status: 'ACTIVE', country: 'Pakistan', websiteUrl: 'https://www.mcbislamicbank.com/', transactionUrl: 'https://www.mcbislamicbank.com/', internalPriority: 2, publicMetadata: { role: 'SOUP banking partner' } },
  });
  await prisma.partner.upsert({
    where: { slug: 'learnersden-application-management' },
    update: { type: 'OTHER', status: 'ACTIVE', name: 'LearnersDen.eu', country: 'International', websiteUrl: 'https://learnersden.eu/', transactionUrl: 'https://learnersden.eu/', internalPriority: 3, publicMetadata: { role: 'SOUP counselling and application management partner' } },
    create: { type: 'OTHER', name: 'LearnersDen.eu', slug: 'learnersden-application-management', status: 'ACTIVE', country: 'International', websiteUrl: 'https://learnersden.eu/', transactionUrl: 'https://learnersden.eu/', internalPriority: 3, publicMetadata: { role: 'SOUP counselling and application management partner' } },
  });
  console.log(`SOUP partner import complete: ${universities} universities, ${programs} program rows, Hellenic Sun/insuremart, MCB Islamic Bank and LearnersDen.eu seeded.`);
  if (embeddedHeaders) console.log(`Ignored ${embeddedHeaders} embedded CSV header rows from the Replit export.`);
  if (missingCoreFields) console.warn(`Skipped ${missingCoreFields} rows missing a university or programme name.`);
  if (unknownUniversities.size) {
    console.warn(`Skipped ${unknownUniversities.size} university name(s) with no country mapping: ${Array.from(unknownUniversities).sort().join(", ")}`);
    process.exitCode = 2;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
