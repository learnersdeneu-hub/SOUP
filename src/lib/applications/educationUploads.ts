import type { DocumentCategory } from "@/lib/documents/categories";

// Which transcript/certificate upload boxes apply for a given
// EducationHistory.intendedDegreeLevel (see EducationHistoryForm.tsx's
// DEGREE_LEVELS chip selector — "Foundation / Pathway" | "Bachelor's" |
// "Master's" | "PhD"). Shared by the Education Background page (which
// boxes to render) and getCustomerDashboardData (whether the section is
// complete), so the two can never silently disagree. "Foundation /
// Pathway" is treated identically to "Bachelor's" — both are pre-bachelor's
// study, needing the same high-school-level evidence.
export function requiredEducationCategories(intendedDegreeLevel: string): DocumentCategory[] {
  switch (intendedDegreeLevel) {
    case "Master's":
      return ["BACHELORS_TRANSCRIPT", "BACHELORS_DEGREE_CERTIFICATE"];
    case "PhD":
      return ["BACHELORS_TRANSCRIPT", "BACHELORS_DEGREE_CERTIFICATE", "MASTERS_TRANSCRIPT", "MASTERS_DEGREE_CERTIFICATE"];
    case "Bachelor's":
    case "Foundation / Pathway":
    default:
      return ["HS_TRANSCRIPT", "HS_DIPLOMA"];
  }
}
