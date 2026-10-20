// Single source of truth for the Motivation Letter / Personal Statement
// region rule (src/lib/applications/writingRequirement.ts): reads
// StudentApplication.university.country, a free-text column (confirmed
// live values include "United Kingdom", "Ireland", "Greece", "Germany",
// "United States", etc. — see universities table). Matched exactly
// (case-insensitively), never by substring, so e.g. "Caribbean
// Netherlands (Saba)" is never mistaken for "Netherlands".
//
// Scope is geographic Europe, not just EU/Schengen, per the product spec.
// Russia, Georgia, Armenia, Azerbaijan and Turkey are deliberately left out
// as transcontinental edge cases whose application conventions don't
// consistently follow the "European motivation letter" pattern this rule
// targets — flagging this as a judgment call rather than a researched
// stance; add any of them here if that's wrong for SOUP's actual program
// mix.
const EUROPEAN_COUNTRIES = new Set(
  [
    "United Kingdom", "Ireland", "France", "Germany", "Italy", "Spain", "Portugal",
    "Netherlands", "Belgium", "Luxembourg", "Switzerland", "Austria", "Greece",
    "Poland", "Czechia", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria",
    "Croatia", "Slovenia", "Serbia", "Bosnia and Herzegovina", "Montenegro", "Albania",
    "North Macedonia", "Kosovo", "Moldova", "Ukraine", "Belarus",
    "Sweden", "Norway", "Denmark", "Finland", "Iceland",
    "Estonia", "Latvia", "Lithuania",
    "Cyprus", "Malta", "Monaco", "Liechtenstein", "San Marino", "Andorra", "Vatican City",
  ].map((name) => name.toLowerCase())
);

export function isEuropeanCountry(country: string | null | undefined): boolean {
  return EUROPEAN_COUNTRIES.has(String(country || "").trim().toLowerCase());
}

const US_ALIASES = new Set(["united states", "united states of america", "usa", "us"]);

export function isUnitedStates(country: string | null | undefined): boolean {
  return US_ALIASES.has(String(country || "").trim().toLowerCase());
}
