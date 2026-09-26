// The Common-App-style "fill once" core student profile: sections 1, 2, 3
// and 5 of the /profile/* forms (Standard Documents and Selected
// Universities reuse the existing /documents and /applications pages
// instead of duplicating them — see ApplicationProgressCard). Stored as JSON
// on StudentCase (coreProfileDetails, fundingDetails, educationHistory,
// testingDetails — see the 20260922120000 migration) because each bundles
// many loosely-structured, mostly-optional sub-fields rather than one
// scalar value. This file is the single source of truth for those shapes so
// the server actions, the forms and any future reader (e.g. an application
// pre-fill) all agree on field names.

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

// --- Section 1: Profile & Details --------------------------------------

export type CoreProfileDetails = {
  preferredName: string;
  gender: string;
  citizenships: string[];
  passportNumber: string;
  passportExpiry: string;
  phone: string;
  phoneCountryCode: string;
  whatsapp: string;
  currentAddress: string;
  permanentAddress: string;
  permanentAddressSameAsCurrent: boolean;
  guardianName: string;
  guardianRelationship: string;
  guardianOccupation: string;
  guardianEmail: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  firstGeneration: boolean | null;
  languagesAtHome: string;
  accommodationNeeds: string;
};

export function normalizeCoreProfileDetails(value: unknown): CoreProfileDetails {
  const r = record(value);
  return {
    preferredName: str(r.preferredName),
    gender: str(r.gender),
    citizenships: strArray(r.citizenships),
    passportNumber: str(r.passportNumber),
    passportExpiry: str(r.passportExpiry),
    phone: str(r.phone),
    phoneCountryCode: str(r.phoneCountryCode),
    whatsapp: str(r.whatsapp),
    currentAddress: str(r.currentAddress),
    permanentAddress: str(r.permanentAddress),
    permanentAddressSameAsCurrent: r.permanentAddressSameAsCurrent === true,
    guardianName: str(r.guardianName),
    guardianRelationship: str(r.guardianRelationship),
    guardianOccupation: str(r.guardianOccupation),
    guardianEmail: str(r.guardianEmail),
    guardianPhone: str(r.guardianPhone),
    emergencyContactName: str(r.emergencyContactName),
    emergencyContactRelationship: str(r.emergencyContactRelationship),
    emergencyContactPhone: str(r.emergencyContactPhone),
    firstGeneration: bool(r.firstGeneration),
    languagesAtHome: str(r.languagesAtHome),
    accommodationNeeds: str(r.accommodationNeeds),
  };
}

// --- Section 2: Funding & Sponsorship -----------------------------------

export type FundingDetails = {
  fundingSource: string;
  sponsorName: string;
  sponsorRelationship: string;
  sponsorContact: string;
  annualBudgetEstimate: string;
  scholarshipInterested: boolean | null;
  scholarshipTypes: string[];
  proofOfFundsStatus: string;
  loanStatus: string;
  loanLender: string;
  currencyPreference: string;
};

export function normalizeFundingDetails(value: unknown): FundingDetails {
  const r = record(value);
  return {
    fundingSource: str(r.fundingSource),
    sponsorName: str(r.sponsorName),
    sponsorRelationship: str(r.sponsorRelationship),
    sponsorContact: str(r.sponsorContact),
    annualBudgetEstimate: str(r.annualBudgetEstimate),
    scholarshipInterested: bool(r.scholarshipInterested),
    scholarshipTypes: strArray(r.scholarshipTypes),
    proofOfFundsStatus: str(r.proofOfFundsStatus) || "NOT_UPLOADED",
    loanStatus: str(r.loanStatus),
    loanLender: str(r.loanLender),
    currencyPreference: str(r.currencyPreference),
  };
}

// --- Section 3: Education & Academic Background -------------------------

export type PriorInstitution = { name: string; startDate: string; endDate: string; country: string; city: string; credential: string };
export type AcademicHonor = { title: string; year: string };

export type EducationHistory = {
  currentInstitutionName: string;
  currentInstitutionCity: string;
  currentInstitutionCountry: string;
  educationSystem: string;
  startDate: string;
  graduationDate: string;
  gpaValue: string;
  gpaScale: string;
  classRank: string;
  priorInstitutions: PriorInstitution[];
  intendedDegreeLevel: string;
  intendedFields: string[];
  honors: AcademicHonor[];
  counselorName: string;
  counselorEmail: string;
};

function priorInstitutions(value: unknown): PriorInstitution[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const r = record(item);
    return { name: str(r.name), startDate: str(r.startDate), endDate: str(r.endDate), country: str(r.country), city: str(r.city), credential: str(r.credential) };
  }).filter((item) => item.name);
}
function honors(value: unknown): AcademicHonor[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const r = record(item);
    return { title: str(r.title), year: str(r.year) };
  }).filter((item) => item.title);
}

export function normalizeEducationHistory(value: unknown): EducationHistory {
  const r = record(value);
  return {
    currentInstitutionName: str(r.currentInstitutionName),
    currentInstitutionCity: str(r.currentInstitutionCity),
    currentInstitutionCountry: str(r.currentInstitutionCountry),
    educationSystem: str(r.educationSystem),
    startDate: str(r.startDate),
    graduationDate: str(r.graduationDate),
    gpaValue: str(r.gpaValue),
    gpaScale: str(r.gpaScale),
    classRank: str(r.classRank),
    priorInstitutions: priorInstitutions(r.priorInstitutions),
    intendedDegreeLevel: str(r.intendedDegreeLevel),
    intendedFields: strArray(r.intendedFields),
    honors: honors(r.honors),
    counselorName: str(r.counselorName),
    counselorEmail: str(r.counselorEmail),
  };
}

// --- Section 5: Testing & Requirements -----------------------------------

export type TestingDetails = {
  englishTestType: string;
  englishScore: string;
  englishTestDate: string;
  englishExpiryDate: string;
  satActType: string;
  satActScore: string;
  satActDate: string;
  graduateTestType: string;
  graduateTestScore: string;
  graduateTestDate: string;
  countrySpecificExam: string;
  predictedGrades: string;
  registrationStatus: string;
};

export function normalizeTestingDetails(value: unknown): TestingDetails {
  const r = record(value);
  return {
    englishTestType: str(r.englishTestType) || "NONE_YET",
    englishScore: str(r.englishScore),
    englishTestDate: str(r.englishTestDate),
    englishExpiryDate: str(r.englishExpiryDate),
    satActType: str(r.satActType),
    satActScore: str(r.satActScore),
    satActDate: str(r.satActDate),
    graduateTestType: str(r.graduateTestType),
    graduateTestScore: str(r.graduateTestScore),
    graduateTestDate: str(r.graduateTestDate),
    countrySpecificExam: str(r.countrySpecificExam),
    predictedGrades: str(r.predictedGrades),
    registrationStatus: str(r.registrationStatus) || "NOT_REGISTERED",
  };
}
