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
  // True once a PASSPORT-category document exists in the vault — see
  // src/lib/documents/categoryQuery.ts. Added alongside the existing
  // identity fields rather than replacing them: the upload is additional
  // evidence, not a substitute for the self-reported fields.
  passportUploaded?: boolean;
  fundingSummary?: string | null;
  // True once a BANK_STATEMENT-category document exists. Replaces the old
  // self-reported proofOfFundsStatus chip as the real signal — see
  // FundingDetailsForm.tsx.
  bankStatementUploaded?: boolean;
  academicBackgroundSummary?: string | null;
  // True once every transcript/certificate box required for the student's
  // selected degree level (EducationHistory.intendedDegreeLevel) has at
  // least one document — computed by the caller (getCustomerDashboardData)
  // since it depends on which boxes apply for that level.
  requiredEducationUploadsComplete?: boolean;
  englishProficiencySummary?: string | null;
  // Single precomputed boolean for the whole Extracurricular &
  // Recommendations section — see the compound rule in
  // getCustomerDashboardData: at least one activity (or "none to add"
  // confirmed), resume uploaded, at least one recommender invited (or "not
  // required" confirmed), and every writing box required by the student's
  // selected universities has text or an uploaded file.
  extracurricularComplete?: boolean;
};

function filled(value: string | null | undefined) {
  return Boolean(String(value || "").trim());
}

// Five sections, each backed by a real, existing (or newly added) SOUP
// field — nothing invented to pad out the list. Standard Documents and
// Selected Universities were removed from this stepper: Selected
// Universities is already fully served by My Colleges (/colleges), and
// Standard Documents' generic AI-classified upload has been replaced by
// explicit, category-specific uploads embedded directly in the sections
// below instead of a separate catch-all page. Order matches the milestone
// display order.
export function computeApplicationProgress(input: ApplicationProgressInput): ApplicationProgressSummary {
  const sections: ApplicationProgressSection[] = [
    {
      key: "profile",
      label: "Profile & Details",
      complete: filled(input.fullName) && filled(input.nationality) && Boolean(input.dateOfBirth) && filled(input.currentCountry) && Boolean(input.passportUploaded),
      href: "/profile/details",
    },
    {
      key: "academic",
      label: "Education Background",
      complete: filled(input.academicBackgroundSummary) && Boolean(input.requiredEducationUploadsComplete),
      href: "/profile/education",
    },
    {
      key: "extracurricular",
      label: "Extracurricular & Recommendations",
      complete: Boolean(input.extracurricularComplete),
      href: "/profile/extracurricular",
    },
    {
      key: "testing",
      label: "Testing & Requirements",
      complete: filled(input.englishProficiencySummary),
      href: "/profile/testing",
    },
    {
      key: "funding",
      label: "Funding & Sponsorship",
      complete: filled(input.fundingSummary) && Boolean(input.bankStatementUploaded),
      href: "/profile/funding",
    },
  ];
  const completedCount = sections.filter((section) => section.complete).length;
  const totalCount = sections.length;
  return { sections, completedCount, totalCount, percent: Math.round((completedCount / totalCount) * 100) };
}
