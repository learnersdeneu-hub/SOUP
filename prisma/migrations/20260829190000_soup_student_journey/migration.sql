-- SOUP student journey foundation. Additive migration on top of the proven GCI schema.
ALTER TYPE "ChatWorkflow" ADD VALUE IF NOT EXISTS 'COUNSELOR';

CREATE TYPE "StudentJourneyStage" AS ENUM ('EXPLORING','SHORTLISTING','APPLYING','AWAITING_DECISIONS','OFFER_RECEIVED','VISA_PREPARATION','PRE_DEPARTURE','ARRIVED');
CREATE TYPE "PartnerType" AS ENUM ('UNIVERSITY','ACCOMMODATION','INSURANCE','STUDENT_FINANCE','SCHOLARSHIP','TRAVEL','OTHER');
CREATE TYPE "PartnershipStatus" AS ENUM ('ACTIVE','PAUSED','INACTIVE');
CREATE TYPE "ApplicationOwnership" AS ENUM ('SOUP_MANAGED','STUDENT_MANAGED_EXTERNAL','ASSISTED_EXTERNAL');
CREATE TYPE "StudentApplicationStatus" AS ENUM ('SHORTLISTED','DOCUMENTS_REQUIRED','READY_TO_SUBMIT','SUBMITTED','UNDER_REVIEW','OFFER_RECEIVED','CONDITIONAL_OFFER','REJECTED','WITHDRAWN','ENROLLED');
CREATE TYPE "ChecklistKind" AS ENUM ('ADMISSION','VISA','PRE_DEPARTURE','ARRIVAL','GENERAL');
CREATE TYPE "ChecklistItemStatus" AS ENUM ('NOT_STARTED','ACTION_REQUIRED','WAITING_FOR_DOCUMENT','DOCUMENT_UPLOADED','COMPLETE','NOT_APPLICABLE','BLOCKED');
CREATE TYPE "ServiceReferralType" AS ENUM ('ACCOMMODATION','INSURANCE','STUDENT_FINANCE','SCHOLARSHIP','TRAVEL','ATTESTATION','OTHER');
CREATE TYPE "ServiceReferralStatus" AS ENUM ('RECOMMENDED','OPENED','STARTED','COMPLETED','DECLINED','EXTERNAL_ONLY');

-- SOUP staff roles extend the inherited account-role enum without sharing GCI production state.
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'COUNSELOR';
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'ADMISSIONS';
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'FINANCE';
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'ACCOMMODATION';
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TABLE "student_cases" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "stage" "StudentJourneyStage" NOT NULL DEFAULT 'EXPLORING',
  "targetDegreeLevel" TEXT,
  "targetSubject" TEXT,
  "preferredIntake" TEXT,
  "preferredRegions" JSONB,
  "preferredCountries" JSONB,
  "searchScope" TEXT,
  "academicBackgroundSummary" TEXT,
  "englishProficiencySummary" TEXT,
  "fundingSummary" TEXT,
  "budgetMin" DECIMAL(12,2),
  "budgetMax" DECIMAL(12,2),
  "budgetCurrency" TEXT,
  "studyLanguage" TEXT,
  "goals" JSONB,
  "constraints" JSONB,
  "nextAction" TEXT,
  "humanHandoffActive" BOOLEAN NOT NULL DEFAULT false,
  "assignedStaffUserId" TEXT,
  "handoffReason" TEXT,
  "handoffStartedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partners" (
  "id" TEXT NOT NULL,
  "type" "PartnerType" NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "PartnershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "country" TEXT,
  "city" TEXT,
  "websiteUrl" TEXT,
  "transactionUrl" TEXT,
  "internalPriority" INTEGER NOT NULL DEFAULT 100,
  "commercialMetadata" JSONB,
  "publicMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "universities" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "city" TEXT,
  "websiteUrl" TEXT,
  "isPublic" BOOLEAN,
  "sourceUrl" TEXT,
  "sourceCheckedAt" TIMESTAMP(3),
  "publicMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "university_programs" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "field" TEXT,
  "studyMode" TEXT,
  "language" TEXT,
  "duration" TEXT,
  "tuitionAmount" DECIMAL(12,2),
  "tuitionCurrency" TEXT,
  "intake" TEXT,
  "applicationDeadline" TEXT,
  "applicationUrl" TEXT,
  "sourceUrl" TEXT,
  "sourceCheckedAt" TIMESTAMP(3),
  "requirements" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "university_programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "university_shortlists" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "studentCaseId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'University Application Plan',
  "regionScope" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "generatedBy" TEXT NOT NULL DEFAULT 'SOUP_COUNSELOR',
  "researchSummary" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "university_shortlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "university_shortlist_items" (
  "id" TEXT NOT NULL,
  "shortlistId" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "programId" TEXT,
  "position" INTEGER NOT NULL,
  "isPartnerAtGeneration" BOOLEAN NOT NULL DEFAULT false,
  "eligibilityStatus" TEXT,
  "rationale" TEXT,
  "cautions" JSONB,
  "sourceUrls" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "university_shortlist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_applications" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "studentCaseId" TEXT NOT NULL,
  "universityId" TEXT,
  "programId" TEXT,
  "ownership" "ApplicationOwnership" NOT NULL,
  "status" "StudentApplicationStatus" NOT NULL DEFAULT 'SHORTLISTED',
  "externalApplicationUrl" TEXT,
  "externalReference" TEXT,
  "submittedAt" TIMESTAMP(3),
  "decisionAt" TIMESTAMP(3),
  "offerDocumentId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_application_documents" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentRole" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journey_checklists" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "studentCaseId" TEXT NOT NULL,
  "applicationId" TEXT,
  "kind" "ChecklistKind" NOT NULL,
  "title" TEXT NOT NULL,
  "destinationCountry" TEXT,
  "authorityName" TEXT,
  "sourceUrl" TEXT,
  "sourceCheckedAt" TIMESTAMP(3),
  "sourceSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journey_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journey_checklist_items" (
  "id" TEXT NOT NULL,
  "checklistId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL,
  "status" "ChecklistItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "externalActionUrl" TEXT,
  "externalActionLabel" TEXT,
  "documentId" TEXT,
  "completedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journey_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_referrals" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "studentCaseId" TEXT NOT NULL,
  "type" "ServiceReferralType" NOT NULL,
  "partnerId" TEXT,
  "status" "ServiceReferralStatus" NOT NULL DEFAULT 'RECOMMENDED',
  "title" TEXT NOT NULL,
  "externalUrl" TEXT,
  "counselorRationale" TEXT,
  "sourceSessionId" TEXT,
  "sourceMessageId" TEXT,
  "partnerReference" TEXT,
  "convertedAt" TIMESTAMP(3),
  "revenueAmount" DECIMAL(12,2),
  "revenueCurrency" TEXT,
  "commissionAmount" DECIMAL(12,2),
  "commissionCurrency" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_cases_profileId_key" ON "student_cases"("profileId");
CREATE INDEX "student_cases_stage_updatedAt_idx" ON "student_cases"("stage","updatedAt");
CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");
CREATE INDEX "partners_type_status_internalPriority_idx" ON "partners"("type","status","internalPriority");
CREATE UNIQUE INDEX "universities_name_country_key" ON "universities"("name","country");
CREATE INDEX "universities_country_name_idx" ON "universities"("country","name");
CREATE INDEX "universities_partnerId_idx" ON "universities"("partnerId");
CREATE INDEX "university_programs_universityId_level_active_idx" ON "university_programs"("universityId","level","active");
CREATE INDEX "university_programs_field_idx" ON "university_programs"("field");
CREATE INDEX "university_shortlists_profileId_generatedAt_idx" ON "university_shortlists"("profileId","generatedAt");
CREATE INDEX "university_shortlists_studentCaseId_generatedAt_idx" ON "university_shortlists"("studentCaseId","generatedAt");
CREATE INDEX "university_shortlist_items_shortlistId_position_idx" ON "university_shortlist_items"("shortlistId","position");
CREATE INDEX "university_shortlist_items_universityId_idx" ON "university_shortlist_items"("universityId");
CREATE UNIQUE INDEX "student_applications_offerDocumentId_key" ON "student_applications"("offerDocumentId");
CREATE INDEX "student_applications_profileId_status_updatedAt_idx" ON "student_applications"("profileId","status","updatedAt");
CREATE INDEX "student_applications_studentCaseId_status_idx" ON "student_applications"("studentCaseId","status");
CREATE INDEX "student_applications_universityId_idx" ON "student_applications"("universityId");
CREATE UNIQUE INDEX "student_application_documents_applicationId_documentId_key" ON "student_application_documents"("applicationId","documentId");
CREATE INDEX "student_application_documents_documentId_idx" ON "student_application_documents"("documentId");
CREATE INDEX "journey_checklists_profileId_kind_updatedAt_idx" ON "journey_checklists"("profileId","kind","updatedAt");
CREATE INDEX "journey_checklists_applicationId_updatedAt_idx" ON "journey_checklists"("applicationId","updatedAt");
CREATE INDEX "journey_checklist_items_checklistId_position_idx" ON "journey_checklist_items"("checklistId","position");
CREATE INDEX "journey_checklist_items_status_dueAt_idx" ON "journey_checklist_items"("status","dueAt");
CREATE INDEX "service_referrals_profileId_type_updatedAt_idx" ON "service_referrals"("profileId","type","updatedAt");
CREATE INDEX "service_referrals_partnerId_status_idx" ON "service_referrals"("partnerId","status");
CREATE INDEX "service_referrals_sourceSessionId_idx" ON "service_referrals"("sourceSessionId");

ALTER TABLE "student_cases" ADD CONSTRAINT "student_cases_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "universities" ADD CONSTRAINT "universities_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "university_programs" ADD CONSTRAINT "university_programs_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_shortlists" ADD CONSTRAINT "university_shortlists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_shortlists" ADD CONSTRAINT "university_shortlists_studentCaseId_fkey" FOREIGN KEY ("studentCaseId") REFERENCES "student_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_shortlist_items" ADD CONSTRAINT "university_shortlist_items_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "university_shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_shortlist_items" ADD CONSTRAINT "university_shortlist_items_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "university_shortlist_items" ADD CONSTRAINT "university_shortlist_items_programId_fkey" FOREIGN KEY ("programId") REFERENCES "university_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_studentCaseId_fkey" FOREIGN KEY ("studentCaseId") REFERENCES "student_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_programId_fkey" FOREIGN KEY ("programId") REFERENCES "university_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_offerDocumentId_fkey" FOREIGN KEY ("offerDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_application_documents" ADD CONSTRAINT "student_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_application_documents" ADD CONSTRAINT "student_application_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_checklists" ADD CONSTRAINT "journey_checklists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_checklists" ADD CONSTRAINT "journey_checklists_studentCaseId_fkey" FOREIGN KEY ("studentCaseId") REFERENCES "student_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_checklists" ADD CONSTRAINT "journey_checklists_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_checklist_items" ADD CONSTRAINT "journey_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "journey_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journey_checklist_items" ADD CONSTRAINT "journey_checklist_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_referrals" ADD CONSTRAINT "service_referrals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_referrals" ADD CONSTRAINT "service_referrals_studentCaseId_fkey" FOREIGN KEY ("studentCaseId") REFERENCES "student_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_referrals" ADD CONSTRAINT "service_referrals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SOUP document validity metadata supports expiry/freshness warnings without changing authority-review semantics.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "documentIssuedAt" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);

-- Preserve source attribution and structured UI metadata for SOUP conversations.
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
