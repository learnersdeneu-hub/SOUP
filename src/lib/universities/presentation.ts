export type UniversityProgramSummaryInput = {
  level?: string | null;
  intake?: string | null;
  tuitionAmount?: unknown;
  tuitionCurrency?: string | null;
  applicationFeeAmount?: unknown;
  applicationFeeCurrency?: string | null;
};

// Program.requirements is a free-form Json column — this is the one key
// pair read out of it for display, set by staff when a program carries its
// own application fee (see tmp scripts used to seed Saarland's Computer
// Science programs). Student-facing text always calls this "application
// fee", regardless of who ultimately receives it.
export function extractApplicationFee(requirements: unknown): { amount: number; currency: string } | null {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return null;
  const record = requirements as Record<string, unknown>;
  const amount = asMoney(record.applicationFeeAmount);
  const currency = String(record.applicationFeeCurrency || "").trim().toUpperCase();
  if (amount == null || !currency) return null;
  return { amount, currency };
}

function asMoney(value: unknown) {
  if (value == null) return null;
  const numeric = Number(typeof value === "object" && value && "toString" in value ? String(value) : value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString("en")}`;
  }
}

function normalizeList(values: Array<string | null | undefined>, limit = 4) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

// Shared by both the tuition fee range and the application fee range below —
// groups amounts by currency, then renders a single value (or an en-dash
// range when programs disagree) per currency, joining a mix of currencies
// with " · ". `suffix` is " / year" for tuition, "" for a one-off fee.
function moneyRange(amounts: Array<{ amount: number; currency: string }>, suffix: string): string | null {
  const byCurrency = new Map<string, number[]>();
  for (const { amount, currency } of amounts) {
    const group = byCurrency.get(currency) || [];
    group.push(amount);
    byCurrency.set(currency, group);
  }
  if (byCurrency.size === 0) return null;
  if (byCurrency.size === 1) {
    const [[currency, group]] = [...byCurrency.entries()];
    const min = Math.min(...group);
    const max = Math.max(...group);
    return min === max ? `${formatMoney(min, currency)}${suffix}` : `${formatMoney(min, currency)}–${formatMoney(max, currency)}${suffix}`;
  }
  return [...byCurrency.entries()].slice(0, 2).map(([currency, group]) => {
    const min = Math.min(...group);
    const max = Math.max(...group);
    return min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
  }).join(" · ");
}

const FIELD_TYPO_FIXES: Record<string, string> = {
  humanties: "Humanities",
};

// Program "field" text was entered by hand across several data imports, so the
// same subject shows up with inconsistent casing (and the occasional typo or
// stray "Yes"/"No"). This groups those into one clean, student-facing label
// per subject instead of fabricating or renaming the underlying subject.
export function normalizeField(raw: string | null | undefined): string | null {
  const trimmed = String(raw || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "yes" || lower === "no") return null;
  if (FIELD_TYPO_FIXES[lower]) return FIELD_TYPO_FIXES[lower];
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function summarizeUniversityPrograms(programs: UniversityProgramSummaryInput[]) {
  const levels = normalizeList(programs.map((program) => program.level), 4);
  const intakes = normalizeList(programs.map((program) => program.intake), 4);

  const tuitionAmounts = programs.flatMap((program) => {
    const amount = asMoney(program.tuitionAmount);
    const currency = String(program.tuitionCurrency || "").trim().toUpperCase();
    return amount != null && currency ? [{ amount, currency }] : [];
  });
  const applicationFeeAmounts = programs.flatMap((program) => {
    const amount = asMoney(program.applicationFeeAmount);
    const currency = String(program.applicationFeeCurrency || "").trim().toUpperCase();
    return amount != null && currency ? [{ amount, currency }] : [];
  });

  return {
    levels,
    intakes,
    feeRange: moneyRange(tuitionAmounts, " / year"),
    applicationFeeRange: moneyRange(applicationFeeAmounts, ""),
    programCount: programs.length,
  };
}
