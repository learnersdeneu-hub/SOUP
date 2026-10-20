import { isEuropeanCountry, isUnitedStates } from "@/lib/applications/europeCountries";

// Configurable word ranges for the two writing boxes (see
// WritingDraftBox / the Extracurricular & Recommendations page). Out of
// range is a non-blocking warning, never enforced on save.
export const MOTIVATION_LETTER_WORD_RANGE = { min: 300, max: 600 };
export const PERSONAL_STATEMENT_WORD_RANGE = { min: 250, max: 650 };

export type WritingRequirement = { motivationLetterRequired: boolean; personalStatementRequired: boolean };

// Which of the two writing boxes are required depends on where the
// student's selected universities (StudentApplication.university.country)
// are — Motivation Letter if any is in Europe, Personal Statement if any
// is in the US. Both stay optional until at least one university is
// selected. See src/lib/applications/europeCountries.ts for exactly which
// field and country list this reads.
export function computeWritingRequirement(applications: Array<{ university: { country: string | null } | null }>): WritingRequirement {
  if (applications.length === 0) return { motivationLetterRequired: false, personalStatementRequired: false };
  let motivationLetterRequired = false;
  let personalStatementRequired = false;
  for (const application of applications) {
    const country = application.university?.country;
    if (isEuropeanCountry(country)) motivationLetterRequired = true;
    if (isUnitedStates(country)) personalStatementRequired = true;
  }
  return { motivationLetterRequired, personalStatementRequired };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
