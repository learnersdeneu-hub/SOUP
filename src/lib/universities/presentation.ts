export type UniversityProgramSummaryInput = {
  level?: string | null;
  intake?: string | null;
  tuitionAmount?: unknown;
  tuitionCurrency?: string | null;
};

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
  const fees = new Map<string, number[]>();

  for (const program of programs) {
    const amount = asMoney(program.tuitionAmount);
    const currency = String(program.tuitionCurrency || "").trim().toUpperCase();
    if (amount == null || !currency) continue;
    const group = fees.get(currency) || [];
    group.push(amount);
    fees.set(currency, group);
  }

  let feeRange: string | null = null;
  if (fees.size === 1) {
    const [[currency, amounts]] = [...fees.entries()];
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    feeRange = min === max
      ? `${formatMoney(min, currency)} / year`
      : `${formatMoney(min, currency)}–${formatMoney(max, currency)} / year`;
  } else if (fees.size > 1) {
    feeRange = [...fees.entries()].slice(0, 2).map(([currency, amounts]) => {
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      return min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
    }).join(" · ");
  }

  return {
    levels,
    intakes,
    feeRange,
    programCount: programs.length,
  };
}
