export type ApplicationProgressSection = { key: string; label: string; complete: boolean; href: string };
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
    // Documents and Selected Universities route to the existing /documents
    // and /applications pages rather than new dedicated pages — SOUP
    // already has a full, working experience for each of those; building a
    // second one under /profile would duplicate it rather than reuse it.
    { key: "profile", label: "Profile & Details", complete: filled(input.fullName) && filled(input.nationality) && Boolean(input.dateOfBirth) && filled(input.currentCountry), href: "/profile/details" },
    { key: "funding", label: "Funding & Sponsorship", complete: filled(input.fundingSummary), href: "/profile/funding" },
    { key: "academic", label: "Education & Academic Background", complete: filled(input.academicBackgroundSummary), href: "/profile/education" },
    { key: "documents", label: "Standard Documents", complete: (input.documentCount ?? 0) > 0, href: "/documents" },
    { key: "testing", label: "Testing & Requirements", complete: filled(input.englishProficiencySummary), href: "/profile/testing" },
    { key: "applications", label: "Selected Universities", complete: (input.applicationCount ?? 0) > 0, href: "/applications" },
  ];
  const completedCount = sections.filter((section) => section.complete).length;
  const totalCount = sections.length;
  return { sections, completedCount, totalCount, percent: Math.round((completedCount / totalCount) * 100) };
}
