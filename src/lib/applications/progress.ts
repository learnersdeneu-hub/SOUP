export type ApplicationProgressSection = { key: string; label: string; complete: boolean };
export type ApplicationProgressSummary = {
  sections: ApplicationProgressSection[];
  completedCount: number;
  totalCount: number;
  percent: number;
};

export type ApplicationProgressInput = {
  fullName?: string | null;
  nationality?: string | null;
  dateOfBirth?: unknown;
  currentCountry?: string | null;
  fundingSummary?: string | null;
  academicBackgroundSummary?: string | null;
  englishProficiencySummary?: string | null;
  documentCount?: number | null;
  applicationCount?: number | null;
};

function filled(value: string | null | undefined) {
  return Boolean(String(value || "").trim());
}

// Every section here is backed by a real, existing SOUP field — nothing
// invented to fill out a six-item checklist. SOUP does not track literal
// family details anywhere in its schema (User/Profile/StudentCase), so the
// closest genuine analog — funding/sponsorship background, which for an
// international student is typically family-provided — stands in for that
// slot rather than fabricating a field or a completion signal that isn't
// real. Order matches the milestone display order.
export function computeApplicationProgress(input: ApplicationProgressInput): ApplicationProgressSummary {
  const sections: ApplicationProgressSection[] = [
    { key: "profile", label: "Profile & Details", complete: filled(input.fullName) && filled(input.nationality) && Boolean(input.dateOfBirth) && filled(input.currentCountry) },
    { key: "funding", label: "Funding & Sponsorship", complete: filled(input.fundingSummary) },
    { key: "academic", label: "Education & Academic Background", complete: filled(input.academicBackgroundSummary) },
    { key: "documents", label: "Standard Documents", complete: (input.documentCount ?? 0) > 0 },
    { key: "testing", label: "Testing & Requirements", complete: filled(input.englishProficiencySummary) },
    { key: "applications", label: "Selected Universities", complete: (input.applicationCount ?? 0) > 0 },
  ];
  const completedCount = sections.filter((section) => section.complete).length;
  const totalCount = sections.length;
  return { sections, completedCount, totalCount, percent: Math.round((completedCount / totalCount) * 100) };
}
