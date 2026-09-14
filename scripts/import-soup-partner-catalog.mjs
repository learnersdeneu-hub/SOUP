import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const supplied = process.argv[2];
if (!supplied) {
  console.error("Usage: node scripts/import-soup-partner-catalog.mjs <catalog.csv>");
  process.exit(1);
}
const file = path.resolve(process.cwd(), supplied);
if (!fs.existsSync(file)) {
  console.error(`Partner catalog not found: ${file}`);
  process.exit(1);
}

const PARTNER_TYPES = new Set(["UNIVERSITY", "ACCOMMODATION", "INSURANCE", "STUDENT_FINANCE", "SCHOLARSHIP", "TRAVEL", "OTHER"]);
const STATUSES = new Set(["ACTIVE", "PAUSED", "INACTIVE"]);

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110);
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
  return rows
    .filter((cells) => cells.some((cell) => String(cell || "").trim()))
    .map((cells, index) => ({ line: index + 2, values: Object.fromEntries(header.map((h, i) => [h, String(cells[i] || "").trim()])) }));
}

function optionalNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Invalid number: ${raw}`);
  return n;
}
function optionalBoolean(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (["true", "yes", "1"].includes(raw)) return true;
  if (["false", "no", "0"].includes(raw)) return false;
  throw new Error(`Invalid boolean: ${value}`);
}
function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsupported URL: ${raw}`);
  if (url.username || url.password) throw new Error(`Credential-bearing URLs are not allowed: ${raw}`);
  return url.toString();
}

function normalizeRow(row) {
  const type = String(row.partner_type || "").trim().toUpperCase();
  const name = String(row.name || "").trim();
  const country = String(row.country || "").trim() || null;
  const city = String(row.city || "").trim() || null;
  const status = String(row.status || "ACTIVE").trim().toUpperCase();
  if (!PARTNER_TYPES.has(type)) throw new Error(`Unknown partner_type ${type}`);
  if (!STATUSES.has(status)) throw new Error(`Unknown status ${status}`);
  if (!name) throw new Error("name is required");
  if (type === "UNIVERSITY" && !country) throw new Error("country is required for universities");

  const websiteUrl = cleanUrl(row.website_url);
  const transactionUrl = cleanUrl(row.transaction_url);
  if (type !== "UNIVERSITY" && status === "ACTIVE" && !transactionUrl) {
    throw new Error("active non-university partners require transaction_url; use PAUSED until SOUP has an authorized route");
  }
  const priorityRaw = optionalNumber(row.priority) ?? 100;
  if (!Number.isInteger(priorityRaw) || priorityRaw < 0 || priorityRaw > 10000) throw new Error("priority must be a whole number from 0 to 10000");

  const title = String(row.program_title || "").trim();
  const level = String(row.program_level || "").trim();
  if ((title && !level) || (!title && level)) throw new Error("program_title and program_level must both be supplied");
  if (type !== "UNIVERSITY" && (title || level)) throw new Error("program fields are valid only for UNIVERSITY partner rows");

  return {
    ...row, type, name, country, city, status, websiteUrl, transactionUrl,
    priority: priorityRaw, title, level,
    universityPublic: optionalBoolean(row.university_public),
    sourceUrl: cleanUrl(row.source_url),
    applicationUrl: cleanUrl(row.application_url),
    tuitionAmount: optionalNumber(row.tuition_amount),
  };
}

async function main() {
  const parsedRows = parseCsv(fs.readFileSync(file, "utf8"));
  const validationErrors = [];
  const rows = [];
  for (const { line, values } of parsedRows) {
    try { rows.push({ line, row: normalizeRow(values) }); }
    catch (error) { validationErrors.push(`Line ${line}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (validationErrors.length) {
    for (const error of validationErrors) console.error(error);
    console.error(`SOUP catalog validation failed: ${validationErrors.length} invalid row(s). Nothing was imported.`);
    process.exitCode = 2;
    return;
  }

  const processedPartners = new Set();
  const processedUniversities = new Set();
  let programs = 0;
  for (const { line, row } of rows) {
    try {
      const slug = `${row.type.toLowerCase()}-${slugify(row.name)}`;
      const partner = await prisma.partner.upsert({
        where: { slug },
        update: {
          type: row.type,
          name: row.name,
          status: row.status,
          country: row.country,
          city: row.city,
          websiteUrl: row.websiteUrl,
          transactionUrl: row.transactionUrl,
          internalPriority: row.priority,
          publicMetadata: { source: path.basename(file), importedAt: new Date().toISOString() },
        },
        create: {
          type: row.type,
          name: row.name,
          slug,
          status: row.status,
          country: row.country,
          city: row.city,
          websiteUrl: row.websiteUrl,
          transactionUrl: row.transactionUrl,
          internalPriority: row.priority,
          publicMetadata: { source: path.basename(file), importedAt: new Date().toISOString() },
        },
      });
      processedPartners.add(partner.id);

      if (row.type !== "UNIVERSITY") continue;
      const university = await prisma.university.upsert({
        where: { name_country: { name: row.name, country: row.country } },
        update: {
          partnerId: partner.id,
          city: row.city,
          websiteUrl: row.websiteUrl,
          isPublic: row.universityPublic,
          sourceUrl: row.sourceUrl,
          sourceCheckedAt: row.sourceUrl ? new Date() : undefined,
          publicMetadata: { source: path.basename(file) },
        },
        create: {
          partnerId: partner.id,
          name: row.name,
          country: row.country,
          city: row.city,
          websiteUrl: row.websiteUrl,
          isPublic: row.universityPublic,
          sourceUrl: row.sourceUrl,
          sourceCheckedAt: row.sourceUrl ? new Date() : undefined,
          publicMetadata: { source: path.basename(file) },
        },
      });
      processedUniversities.add(university.id);

      if (!row.title && !row.level) continue;
      const existing = await prisma.universityProgram.findFirst({ where: { universityId: university.id, title: row.title, level: row.level } });
      const programData = {
        field: String(row.program_field || "").trim() || null,
        studyMode: String(row.study_mode || "").trim() || null,
        language: String(row.language || "").trim() || null,
        duration: String(row.duration || "").trim() || null,
        tuitionAmount: row.tuitionAmount,
        tuitionCurrency: String(row.tuition_currency || "").trim().toUpperCase() || null,
        intake: String(row.intake || "").trim() || null,
        applicationDeadline: String(row.application_deadline || "").trim() || null,
        applicationUrl: row.applicationUrl,
        sourceUrl: row.sourceUrl,
        sourceCheckedAt: row.sourceUrl ? new Date() : undefined,
        active: row.status === "ACTIVE",
      };
      if (existing) await prisma.universityProgram.update({ where: { id: existing.id }, data: programData });
      else await prisma.universityProgram.create({ data: { universityId: university.id, title: row.title, level: row.level, ...programData } });
      programs++;
    } catch (error) {
      console.error(`Line ${line}: database import failed after validation: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`SOUP catalog import finished: ${processedPartners.size} unique partners, ${processedUniversities.size} unique universities, ${programs} program rows.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
