"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

function clean(value: FormDataEntryValue | null, max = 200) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : "";
}
function cleanBool(value: FormDataEntryValue | null): boolean | null {
  const raw = String(value || "");
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}
function cleanArray(value: FormDataEntryValue | null): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()).slice(0, 20) : [];
  } catch {
    return [];
  }
}
function cleanJsonArray(value: FormDataEntryValue | null): Record<string, string>[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20).map((item) => {
      if (!item || typeof item !== "object") return {};
      const out: Record<string, string> = {};
      for (const [key, val] of Object.entries(item as Record<string, unknown>)) {
        if (typeof val === "string") out[key] = val;
      }
      return out;
    });
  } catch {
    return [];
  }
}

export async function saveCoreProfileDetails(formData: FormData) {
  const { profile } = await requireProfile();
  const data = {
    preferredName: clean(formData.get("preferredName"), 120),
    gender: clean(formData.get("gender"), 60),
    citizenships: cleanArray(formData.get("citizenships")),
    passportNumber: clean(formData.get("passportNumber"), 40),
    passportExpiry: clean(formData.get("passportExpiry"), 10),
    phone: clean(formData.get("phone"), 40),
    phoneCountryCode: clean(formData.get("phoneCountryCode"), 10),
    whatsapp: clean(formData.get("whatsapp"), 40),
    currentAddress: clean(formData.get("currentAddress"), 400),
    permanentAddress: clean(formData.get("permanentAddress"), 400),
    permanentAddressSameAsCurrent: cleanBool(formData.get("permanentAddressSameAsCurrent")) === true,
    guardianName: clean(formData.get("guardianName"), 120),
    guardianRelationship: clean(formData.get("guardianRelationship"), 60),
    guardianOccupation: clean(formData.get("guardianOccupation"), 120),
    guardianEmail: clean(formData.get("guardianEmail"), 160),
    guardianPhone: clean(formData.get("guardianPhone"), 40),
    emergencyContactName: clean(formData.get("emergencyContactName"), 120),
    emergencyContactRelationship: clean(formData.get("emergencyContactRelationship"), 60),
    emergencyContactPhone: clean(formData.get("emergencyContactPhone"), 40),
    firstGeneration: cleanBool(formData.get("firstGeneration")),
    languagesAtHome: clean(formData.get("languagesAtHome"), 200),
    accommodationNeeds: clean(formData.get("accommodationNeeds"), 400),
  };
  await prisma.studentCase.upsert({
    where: { profileId: profile.id },
    update: { coreProfileDetails: data },
    create: { profileId: profile.id, coreProfileDetails: data },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/details");
}

export async function saveFundingDetails(formData: FormData) {
  const { profile } = await requireProfile();
  const data = {
    fundingSource: clean(formData.get("fundingSource"), 60),
    sponsorName: clean(formData.get("sponsorName"), 120),
    sponsorRelationship: clean(formData.get("sponsorRelationship"), 60),
    sponsorContact: clean(formData.get("sponsorContact"), 160),
    annualBudgetEstimate: clean(formData.get("annualBudgetEstimate"), 60),
    scholarshipInterested: cleanBool(formData.get("scholarshipInterested")),
    scholarshipTypes: cleanArray(formData.get("scholarshipTypes")),
    proofOfFundsStatus: clean(formData.get("proofOfFundsStatus"), 30) || "NOT_UPLOADED",
    loanStatus: clean(formData.get("loanStatus"), 60),
    loanLender: clean(formData.get("loanLender"), 120),
    currencyPreference: clean(formData.get("currencyPreference"), 10),
  };
  // fundingSummary (the existing plain-text field Noodles' saved context
  // already reads) is kept in sync from this structured form so the AI
  // context and this new detailed page never silently disagree.
  const summaryParts = [
    data.fundingSource && `Primary funding: ${data.fundingSource}`,
    data.sponsorName && `Sponsor: ${data.sponsorName}${data.sponsorRelationship ? ` (${data.sponsorRelationship})` : ""}`,
    data.annualBudgetEstimate && `Estimated annual budget: ${data.annualBudgetEstimate}`,
  ].filter(Boolean);
  await prisma.studentCase.upsert({
    where: { profileId: profile.id },
    update: { fundingDetails: data, ...(summaryParts.length ? { fundingSummary: summaryParts.join(". ") } : {}) },
    create: { profileId: profile.id, fundingDetails: data, fundingSummary: summaryParts.join(". ") || null },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/funding");
}

export async function saveEducationHistory(formData: FormData) {
  const { profile } = await requireProfile();
  const data = {
    currentInstitutionName: clean(formData.get("currentInstitutionName"), 200),
    currentInstitutionCountry: clean(formData.get("currentInstitutionCountry"), 80),
    educationSystem: clean(formData.get("educationSystem"), 80),
    startDate: clean(formData.get("startDate"), 10),
    graduationDate: clean(formData.get("graduationDate"), 10),
    gpaValue: clean(formData.get("gpaValue"), 20),
    gpaScale: clean(formData.get("gpaScale"), 20),
    classRank: clean(formData.get("classRank"), 40),
    priorInstitutions: cleanJsonArray(formData.get("priorInstitutions")),
    intendedDegreeLevel: clean(formData.get("intendedDegreeLevel"), 60),
    intendedFields: cleanArray(formData.get("intendedFields")),
    honors: cleanJsonArray(formData.get("honors")),
    counselorName: clean(formData.get("counselorName"), 120),
    counselorEmail: clean(formData.get("counselorEmail"), 160),
  };
  // academicBackgroundSummary stays in sync for the same reason as
  // fundingSummary above — it's what Noodles and every existing "Core
  // application information" display already reads.
  const summaryParts = [
    data.currentInstitutionName && `${data.intendedDegreeLevel || "Studying"} at ${data.currentInstitutionName}${data.currentInstitutionCountry ? `, ${data.currentInstitutionCountry}` : ""}`,
    data.gpaValue && `GPA/result: ${data.gpaValue}${data.gpaScale ? ` (${data.gpaScale})` : ""}`,
    data.intendedFields.length && `Intended field(s): ${data.intendedFields.join(", ")}`,
  ].filter(Boolean);
  await prisma.studentCase.upsert({
    where: { profileId: profile.id },
    update: { educationHistory: data, ...(summaryParts.length ? { academicBackgroundSummary: summaryParts.join(". ") } : {}) },
    create: { profileId: profile.id, educationHistory: data, academicBackgroundSummary: summaryParts.join(". ") || null },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/education");
  revalidatePath("/applications");
}

export async function saveTestingDetails(formData: FormData) {
  const { profile } = await requireProfile();
  const data = {
    englishTestType: clean(formData.get("englishTestType"), 30) || "NONE_YET",
    englishScore: clean(formData.get("englishScore"), 20),
    englishTestDate: clean(formData.get("englishTestDate"), 10),
    englishExpiryDate: clean(formData.get("englishExpiryDate"), 10),
    satActType: clean(formData.get("satActType"), 10),
    satActScore: clean(formData.get("satActScore"), 20),
    satActDate: clean(formData.get("satActDate"), 10),
    graduateTestType: clean(formData.get("graduateTestType"), 10),
    graduateTestScore: clean(formData.get("graduateTestScore"), 20),
    graduateTestDate: clean(formData.get("graduateTestDate"), 10),
    countrySpecificExam: clean(formData.get("countrySpecificExam"), 200),
    predictedGrades: clean(formData.get("predictedGrades"), 200),
    registrationStatus: clean(formData.get("registrationStatus"), 30) || "NOT_REGISTERED",
  };
  const summaryParts = [
    data.englishTestType !== "NONE_YET" && data.englishScore && `${data.englishTestType}: ${data.englishScore}${data.englishTestDate ? ` (${data.englishTestDate})` : ""}`,
    data.satActType && data.satActScore && `${data.satActType}: ${data.satActScore}`,
    data.graduateTestType && data.graduateTestScore && `${data.graduateTestType}: ${data.graduateTestScore}`,
  ].filter(Boolean);
  await prisma.studentCase.upsert({
    where: { profileId: profile.id },
    update: { testingDetails: data, ...(summaryParts.length ? { englishProficiencySummary: summaryParts.join(". ") } : {}) },
    create: { profileId: profile.id, testingDetails: data, englishProficiencySummary: summaryParts.join(". ") || null },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/testing");
}
