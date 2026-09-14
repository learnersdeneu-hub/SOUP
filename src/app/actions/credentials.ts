"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCredentialTypeId } from "@/lib/queries/credentialTypes";
import { uploadDocument } from "@/app/actions/documents";
import { submitForVerification } from "@/app/actions/verification";

async function requireProfileId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  return profile.id;
}

export async function createEducationCredential(formData: FormData) {
  const profileId = await requireProfileId();
  const credentialTypeId = await getCredentialTypeId("EDUCATION");

  const institutionName = String(formData.get("institutionName") || "").trim();
  const degreeType = String(formData.get("degreeType") || "").trim();
  const fieldOfStudy = String(formData.get("fieldOfStudy") || "").trim() || null;
  const graduationDateRaw = String(formData.get("graduationDate") || "");
  const file = formData.get("file") as File | null;

  if (!institutionName || !degreeType) {
    throw new Error("Institution name and degree type are required.");
  }

  const credential = await prisma.credential.create({
    data: {
      profileId,
      credentialTypeId,
      sourceType: file ? "DOCUMENT_UPLOADED" : "SELF_REPORTED",
      verificationStatus: "DRAFT",
    },
  });

  await prisma.educationCredentialDetail.create({
    data: {
      credentialId: credential.id,
      institutionName,
      degreeType,
      fieldOfStudy,
      graduationDate: graduationDateRaw ? new Date(graduationDateRaw) : null,
    },
  });

  if (file && file.size > 0) {
    const documentId = await uploadDocument(profileId, file, "EDUCATION_TRANSCRIPT");
    await prisma.document.update({ where: { id: documentId }, data: { credentialId: credential.id } });
  }

  await submitForVerification(credential.id);
  revalidatePath("/documents");
}

export async function createEmploymentCredential(formData: FormData) {
  const profileId = await requireProfileId();
  const credentialTypeId = await getCredentialTypeId("EMPLOYMENT");

  const employerName = String(formData.get("employerName") || "").trim();
  const jobTitle = String(formData.get("jobTitle") || "").trim();
  const startDateRaw = String(formData.get("startDate") || "");
  const file = formData.get("file") as File | null;

  if (!employerName || !jobTitle || !startDateRaw) {
    throw new Error("Employer, job title, and start date are required.");
  }

  const credential = await prisma.credential.create({
    data: {
      profileId,
      credentialTypeId,
      sourceType: file ? "DOCUMENT_UPLOADED" : "SELF_REPORTED",
      verificationStatus: "DRAFT",
    },
  });

  await prisma.employmentCredentialDetail.create({
    data: {
      credentialId: credential.id,
      employerName,
      jobTitle,
      startDate: new Date(startDateRaw),
    },
  });

  if (file && file.size > 0) {
    const documentId = await uploadDocument(profileId, file, "EMPLOYMENT_LETTER");
    await prisma.document.update({ where: { id: documentId }, data: { credentialId: credential.id } });
  }

  await submitForVerification(credential.id);
  revalidatePath("/documents");
}

export async function createIdentityCredential(formData: FormData) {
  const profileId = await requireProfileId();
  const credentialTypeId = await getCredentialTypeId("IDENTITY");

  const documentType = String(formData.get("documentType") || "").trim();
  const documentCountry = String(formData.get("documentCountry") || "").trim();
  const file = formData.get("file") as File | null;

  if (!documentType || !documentCountry || !file || file.size === 0) {
    throw new Error("Document type, issuing country, and a file upload are required.");
  }

  const credential = await prisma.credential.create({
    data: {
      profileId,
      credentialTypeId,
      sourceType: "DOCUMENT_UPLOADED",
      verificationStatus: "DRAFT",
    },
  });

  // kycVendorRef / kycConfidenceScore / livenessCheckPassed intentionally
  // left null — no KYC vendor is integrated yet (see verification engine
  // notes). Populate these once a vendor is selected and wired in.
  await prisma.identityCredentialDetail.create({
    data: {
      credentialId: credential.id,
      documentType,
      documentCountry,
    },
  });

  const documentId = await uploadDocument(profileId, file, "IDENTITY_DOCUMENT");
  await prisma.document.update({ where: { id: documentId }, data: { credentialId: credential.id } });

  await submitForVerification(credential.id);
  revalidatePath("/documents");
}

export async function createFinancialCredential(formData: FormData) {
  const profileId = await requireProfileId();
  const credentialTypeId = await getCredentialTypeId("FINANCIAL");

  const attestingInstitutionName = String(formData.get("attestingInstitutionName") || "").trim();
  const attestationCategory = String(formData.get("attestationCategory") || "").trim();
  const file = formData.get("file") as File | null;

  if (!attestingInstitutionName || !attestationCategory) {
    throw new Error("Institution name and attestation category are required.");
  }

  const credential = await prisma.credential.create({
    data: {
      profileId,
      credentialTypeId,
      sourceType: file ? "DOCUMENT_UPLOADED" : "SELF_REPORTED",
      verificationStatus: "DRAFT",
    },
  });

  await prisma.financialCredentialDetail.create({
    data: {
      credentialId: credential.id,
      attestingInstitutionName,
      attestationCategory,
    },
  });

  if (file && file.size > 0) {
    const documentId = await uploadDocument(profileId, file, "FINANCIAL_STATEMENT");
    await prisma.document.update({ where: { id: documentId }, data: { credentialId: credential.id } });
  }

  await submitForVerification(credential.id);
  revalidatePath("/documents");
  revalidatePath("/counselor");
}
