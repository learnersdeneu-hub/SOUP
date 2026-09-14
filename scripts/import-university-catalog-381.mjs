// Imports the 381-entry partner-university masterlist (+ the newly-added
// Grandlink direct-partnership list) into University/Partner records.
//
// Channel handling:
// - "AHZ"-sourced entries are grouped under one AHZ Partner record (an
//   indirect recruitment agency partner — SOUP's relationship is with AHZ,
//   not a direct agreement with each individual university).
// - Grandlink entries are grouped under one Grandlink Partner record, per an
//   explicit direct partnership confirmation.
// - "Existing Masterlist" entries are imported WITHOUT a Partner link
//   (partnerId left null). The source data only says where SOUP learned of
//   these institutions, not that a formal partnership/commission agreement
//   exists — asserting partner status the data doesn't confirm would be
//   exactly the kind of fabricated/overclaimed information this project
//   explicitly must avoid. They are still tagged with a "MASTERLIST" network
//   entry so the catalogue can filter/label them honestly as SOUP-catalogued
//   rather than confirmed-partner.
//
// Every network tag lives in University.publicMetadata.networks (a plain
// string array) — the same field/shape the app already reads elsewhere
// (ApplicationNetworkPanel, knownWebsites) — no Prisma schema change needed.
//
// Idempotent: safe to re-run. Existing University rows (matched by
// normalized name + country) are left untouched; only genuinely new
// institutions are created.

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((key, index) => { row[key] = (cells[index] || "").trim(); });
    return row;
  });
}

// Minimal CSV splitter handling quoted fields with embedded commas.
function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else current += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ",") { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function ensurePartner(slug, name) {
  return prisma.partner.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name,
      type: "UNIVERSITY",
      status: "ACTIVE",
      internalPriority: 500, // below the original hand-curated direct partners
    },
  });
}

async function main() {
  const masterlist = parseCsv(fs.readFileSync(path.join(ROOT, "data/soup-381-partner-universities.csv"), "utf8"));
  const grandlink = parseCsv(fs.readFileSync(path.join(ROOT, "data/soup-grandlink-partner-universities.csv"), "utf8"));

  const existing = await prisma.university.findMany({ select: { name: true, country: true } });
  const existingKeys = new Set(existing.map((u) => `${normalizeName(u.name)}|${normalizeName(u.country)}`));

  const ahzPartner = await ensurePartner("ahz", "AHZ");
  const grandlinkPartner = await ensurePartner("grandlink", "Grandlink");

  const rows = [
    ...masterlist.map((row) => ({
      name: row["Institution"],
      country: row["Country"],
      channel: row["Partner Source"] === "AHZ" ? "AHZ" : "MASTERLIST",
      partnerId: row["Partner Source"] === "AHZ" ? ahzPartner.id : null,
    })),
    ...grandlink.map((row) => ({
      name: row["Institution"],
      country: row["Country"],
      channel: "GRANDLINK",
      partnerId: grandlinkPartner.id,
    })),
  ].filter((row) => row.name && row.country);

  const summary = { created: 0, skippedExisting: 0, skippedDuplicateInBatch: 0, byChannel: {} };
  const seenThisRun = new Set();

  for (const row of rows) {
    const key = `${normalizeName(row.name)}|${normalizeName(row.country)}`;
    summary.byChannel[row.channel] = (summary.byChannel[row.channel] || 0) + 1;
    if (existingKeys.has(key) || seenThisRun.has(key)) {
      if (existingKeys.has(key)) summary.skippedExisting++;
      else summary.skippedDuplicateInBatch++;
      continue;
    }
    seenThisRun.add(key);
    await prisma.university.create({
      data: {
        name: row.name,
        country: row.country,
        partnerId: row.partnerId,
        publicMetadata: { networks: [row.channel] },
      },
    });
    summary.created++;
  }

  console.log("Import summary:", JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => { console.error("IMPORT_FAILED", error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
