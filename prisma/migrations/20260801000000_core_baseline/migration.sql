-- GCI Core baseline migration generated from the pre-Passport production Prisma schema.
-- Creates Core + chat tables only. Sprint 1 Passport changes are applied by later migrations.
-- IMPORTANT: On an existing database that already contains Core tables, do not execute this SQL.
-- First mark it applied: npx prisma migrate resolve --applied 20260801000000_core_baseline

CREATE TYPE "DataRegion" AS ENUM ('US', 'EU', 'APAC', 'GLOBAL_DEFAULT');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "CredentialStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'INSUFFICIENT_EVIDENCE', 'EXPIRED', 'DISPUTED');
CREATE TYPE "VerificationRequestStatus" AS ENUM ('SUBMITTED', 'ROUTED_AUTOMATED', 'ROUTED_MANUAL', 'AUTO_RESOLVED', 'ESCALATED_TO_MANUAL', 'RESOLVED', 'EXPIRED');
CREATE TYPE "SourceType" AS ENUM ('SELF_REPORTED', 'DOCUMENT_UPLOADED', 'INSTITUTION_ATTESTED', 'VENDOR_VERIFIED');
CREATE TYPE "AttestationResult" AS ENUM ('CONFIRMED', 'REJECTED', 'PARTIALLY_CONFIRMED', 'PENDING_APPROVAL');
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');
CREATE TYPE "OrgVerificationStatus" AS ENUM ('ORG_PENDING', 'ORG_VERIFIED', 'ORG_SUSPENDED');
CREATE TYPE "OrgMembershipRole" AS ENUM ('ORG_ADMIN', 'REVIEWER', 'READ_ONLY');
CREATE TYPE "OrgMembershipStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CONSENT_PENDING', 'CONSENT_GRANTED', 'CONSENT_DENIED', 'UNDER_REVIEW', 'DECISION_RECORDED', 'CLOSED');
CREATE TYPE "ConsentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED');
CREATE TYPE "ConsentGrantStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "IdentityFlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'CONFIRMED');
CREATE TYPE "MergeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'ERASURE', 'PORTABILITY');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE "CaseBatchStatus" AS ENUM ('OPEN', 'PROCESSING', 'CLOSED');
CREATE TYPE "ChatWorkflow" AS ENUM ('RESUME', 'REPORT', 'FINANCIAL', 'LEARN');
CREATE TYPE "ChatSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "identity_anchors" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_anchors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_duplicate_flags" (
  "id" TEXT NOT NULL,
  "candidateAnchorA" TEXT NOT NULL,
  "candidateAnchorB" TEXT NOT NULL,
  "confidenceScore" DECIMAL(5,4) NOT NULL,
  "detectionMethod" TEXT NOT NULL,
  "status" "IdentityFlagStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "identity_duplicate_flags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_merge_requests" (
  "id" TEXT NOT NULL,
  "primaryAnchorId" TEXT NOT NULL,
  "mergedAnchorId" TEXT NOT NULL,
  "initiatedBy" TEXT NOT NULL,
  "status" "MergeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  CONSTRAINT "identity_merge_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_dispute_cases" (
  "id" TEXT NOT NULL,
  "anchorId" TEXT NOT NULL,
  "raisedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "identity_dispute_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "authProvider" TEXT NOT NULL DEFAULT 'supabase',
  "fullName" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "nationality" TEXT,
  "currentCountry" TEXT,
  "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "identityAnchorId" TEXT,
  "dataRegion" "DataRegion" NOT NULL DEFAULT 'GLOBAL_DEFAULT',
  "headlineSummary" TEXT,
  "profileCompletenessPct" INTEGER NOT NULL DEFAULT 0,
  "lastScoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credential_types" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isStructured" BOOLEAN NOT NULL DEFAULT FALSE,
  "requiresMakerChecker" BOOLEAN NOT NULL DEFAULT FALSE,
  "defaultSlaDays" INTEGER NOT NULL DEFAULT 14,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credential_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credentials" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "credentialTypeId" TEXT NOT NULL,
  "sourceType" "SourceType" NOT NULL,
  "verificationStatus" "CredentialStatus" NOT NULL DEFAULT 'DRAFT',
  "issuingEntityName" TEXT,
  "issuingOrgId" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "dataRegion" "DataRegion" NOT NULL DEFAULT 'GLOBAL_DEFAULT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_credential_details" (
  "credentialId" TEXT NOT NULL,
  "institutionName" TEXT NOT NULL,
  "institutionCountry" TEXT,
  "degreeType" TEXT NOT NULL,
  "fieldOfStudy" TEXT,
  "graduationDate" TIMESTAMP(3),
  "gpaOrGrade" TEXT,
  CONSTRAINT "education_credential_details_pkey" PRIMARY KEY ("credentialId")
);

CREATE TABLE "employment_credential_details" (
  "credentialId" TEXT NOT NULL,
  "employerName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "employmentType" TEXT,
  "country" TEXT,
  CONSTRAINT "employment_credential_details_pkey" PRIMARY KEY ("credentialId")
);

CREATE TABLE "identity_credential_details" (
  "credentialId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentCountry" TEXT NOT NULL,
  "kycVendorRef" TEXT,
  "kycConfidenceScore" DECIMAL(5,4),
  "livenessCheckPassed" BOOLEAN,
  CONSTRAINT "identity_credential_details_pkey" PRIMARY KEY ("credentialId")
);

CREATE TABLE "financial_credential_details" (
  "credentialId" TEXT NOT NULL,
  "attestingInstitutionName" TEXT NOT NULL,
  "attestationCategory" TEXT NOT NULL,
  CONSTRAINT "financial_credential_details_pkey" PRIMARY KEY ("credentialId")
);

CREATE TABLE "credential_flexible_data" (
  "credentialId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "credential_flexible_data_pkey" PRIMARY KEY ("credentialId")
);

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "credentialId" TEXT,
  "storageRef" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "dataRegion" "DataRegion" NOT NULL DEFAULT 'GLOBAL_DEFAULT',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedBy" TEXT NOT NULL,
  "retentionExpiry" TIMESTAMP(3),
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_sla_configs" (
  "id" TEXT NOT NULL,
  "credentialTypeId" TEXT NOT NULL,
  "orgTypeId" TEXT,
  "slaDays" INTEGER NOT NULL,
  CONSTRAINT "verification_sla_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_requests" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "requestedMethod" "SourceType" NOT NULL,
  "vendorRef" TEXT,
  "targetOrgId" TEXT,
  "status" "VerificationRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolutionNotes" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attestation_standards" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  CONSTRAINT "attestation_standards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attestations" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "verificationRequestId" TEXT,
  "attestingOrgId" TEXT NOT NULL,
  "attestingOrgMembershipId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "result" "AttestationResult" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "attestationStandardId" TEXT,
  "confirmationScope" TEXT,
  "evidenceChecksum" TEXT,
  "evidenceDocumentId" TEXT,
  "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attestation_approvals" (
  "id" TEXT NOT NULL,
  "attestationId" TEXT NOT NULL,
  "approverOrgMembershipId" TEXT NOT NULL,
  "decision" "ApprovalDecision" NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "attestation_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attestation_revocation_events" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "triggeredByUserId" TEXT NOT NULL,
  "affectedAttestationIds" TEXT[] NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attestation_revocation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_types" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "organization_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "organizationTypeId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'ORG_PENDING',
  "ssoConfig" JSONB,
  "dataRegion" "DataRegion" NOT NULL DEFAULT 'GLOBAL_DEFAULT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_data_residency_policies" (
  "orgId" TEXT NOT NULL,
  "requiredRegion" "DataRegion" NOT NULL,
  CONSTRAINT "org_data_residency_policies_pkey" PRIMARY KEY ("orgId")
);

CREATE TABLE "org_memberships" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "role" "OrgMembershipRole" NOT NULL,
  "status" "OrgMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_types" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "case_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_batches" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "caseTypeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CaseBatchStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_policy_versions" (
  "id" TEXT NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "policyText" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cases" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "caseTypeId" TEXT NOT NULL,
  "batchId" TEXT,
  "initiatedBy" TEXT NOT NULL,
  "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
  "externalReference" TEXT,
  "decisionDisclaimerVersionId" TEXT,
  "disclaimerAcknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_requests" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "requestedScope" TEXT[] NOT NULL,
  "status" "ConsentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "policyVersionId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "consent_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_grants" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "scope" TEXT[] NOT NULL,
  "policyVersionId" TEXT NOT NULL,
  "status" "ConsentGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_audit_logs" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "orgMembershipId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "consentGrantId" TEXT NOT NULL,
  "accessedFields" TEXT[] NOT NULL,
  "dataRegion" "DataRegion" NOT NULL DEFAULT 'GLOBAL_DEFAULT',
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_categories" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "score_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scoring_rule_versions" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "weightsConfig" JSONB NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scoring_rule_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_bands" (
  "id" TEXT NOT NULL,
  "minValue" DECIMAL(2,1) NOT NULL,
  "maxValue" DECIMAL(2,1) NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "score_bands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scores" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "internalValue" DECIMAL(7,4) NOT NULL,
  "publicScore" DECIMAL(2,1) NOT NULL,
  "rulesVersionId" TEXT NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_explanation_factors" (
  "id" TEXT NOT NULL,
  "scoreId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "contributionWeight" DECIMAL(6,4) NOT NULL,
  "verificationStatusAtTime" "CredentialStatus" NOT NULL,
  CONSTRAINT "score_explanation_factors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_narratives" (
  "id" TEXT NOT NULL,
  "scoreId" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "narrativeText" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "score_narratives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_overrides" (
  "id" TEXT NOT NULL,
  "scoreId" TEXT NOT NULL,
  "overriddenByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "previousPublicScore" DECIMAL(2,1) NOT NULL,
  "newPublicScore" DECIMAL(2,1) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "score_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_requests" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "refereeName" TEXT NOT NULL,
  "refereeContact" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_invitations" (
  "id" TEXT NOT NULL,
  "referenceRequestId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reference_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_responses" (
  "id" TEXT NOT NULL,
  "referenceRequestId" TEXT NOT NULL,
  "respondingUserId" TEXT,
  "contentStructured" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reference_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_verifications" (
  "id" TEXT NOT NULL,
  "referenceResponseId" TEXT NOT NULL,
  "refereeIdentityAnchorId" TEXT,
  "refereeVerifiedEmploymentCredentialId" TEXT,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timeline_events" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "sourceCredentialId" TEXT,
  "sourceCaseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "visibilityScope" TEXT NOT NULL DEFAULT 'OWNER_ONLY',
  CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_subject_requests" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "requestType" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'RECEIVED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_sessions" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "workflow" "ChatWorkflow" NOT NULL,
  "status" "ChatSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "totalSteps" INTEGER NOT NULL DEFAULT 10,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSavedAt" TIMESTAMP(3),
  CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" "ChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
CREATE UNIQUE INDEX "credential_types_code_key" ON "credential_types"("code");
CREATE UNIQUE INDEX "verification_sla_configs_credentialTypeId_orgTypeId_key" ON "verification_sla_configs"("credentialTypeId", "orgTypeId");
CREATE UNIQUE INDEX "attestation_standards_code_key" ON "attestation_standards"("code");
CREATE UNIQUE INDEX "attestation_approvals_attestationId_approverOrgMembershipId_key" ON "attestation_approvals"("attestationId", "approverOrgMembershipId");
CREATE UNIQUE INDEX "organization_types_code_key" ON "organization_types"("code");
CREATE UNIQUE INDEX "org_memberships_userId_orgId_key" ON "org_memberships"("userId", "orgId");
CREATE UNIQUE INDEX "case_types_code_key" ON "case_types"("code");
CREATE UNIQUE INDEX "consent_policy_versions_versionLabel_key" ON "consent_policy_versions"("versionLabel");
CREATE UNIQUE INDEX "consent_requests_caseId_key" ON "consent_requests"("caseId");
CREATE UNIQUE INDEX "score_categories_code_key" ON "score_categories"("code");
CREATE UNIQUE INDEX "scoring_rule_versions_categoryId_versionNumber_key" ON "scoring_rule_versions"("categoryId", "versionNumber");
CREATE UNIQUE INDEX "reference_invitations_referenceRequestId_key" ON "reference_invitations"("referenceRequestId");
CREATE UNIQUE INDEX "reference_invitations_tokenHash_key" ON "reference_invitations"("tokenHash");
CREATE UNIQUE INDEX "reference_responses_referenceRequestId_key" ON "reference_responses"("referenceRequestId");
CREATE UNIQUE INDEX "reference_verifications_referenceResponseId_key" ON "reference_verifications"("referenceResponseId");
CREATE INDEX "identity_duplicate_flags_status_idx" ON "identity_duplicate_flags"("status");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "profiles_identityAnchorId_idx" ON "profiles"("identityAnchorId");
CREATE INDEX "credentials_profileId_credentialTypeId_idx" ON "credentials"("profileId", "credentialTypeId");
CREATE INDEX "credentials_verificationStatus_idx" ON "credentials"("verificationStatus");
CREATE INDEX "documents_profileId_idx" ON "documents"("profileId");
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");
CREATE INDEX "verification_requests_credentialId_idx" ON "verification_requests"("credentialId");
CREATE INDEX "attestations_credentialId_idx" ON "attestations"("credentialId");
CREATE INDEX "attestations_attestingOrgId_idx" ON "attestations"("attestingOrgId");
CREATE INDEX "organizations_organizationTypeId_idx" ON "organizations"("organizationTypeId");
CREATE INDEX "cases_orgId_status_idx" ON "cases"("orgId", "status");
CREATE INDEX "consent_requests_profileId_status_idx" ON "consent_requests"("profileId", "status");
CREATE INDEX "consent_grants_profileId_status_idx" ON "consent_grants"("profileId", "status");
CREATE INDEX "consent_grants_caseId_idx" ON "consent_grants"("caseId");
CREATE INDEX "access_audit_logs_profileId_accessedAt_idx" ON "access_audit_logs"("profileId", "accessedAt");
CREATE INDEX "access_audit_logs_orgId_accessedAt_idx" ON "access_audit_logs"("orgId", "accessedAt");
CREATE INDEX "scores_profileId_categoryId_computedAt_idx" ON "scores"("profileId", "categoryId", "computedAt");
CREATE INDEX "score_explanation_factors_scoreId_idx" ON "score_explanation_factors"("scoreId");
CREATE INDEX "score_explanation_factors_credentialId_idx" ON "score_explanation_factors"("credentialId");
CREATE INDEX "score_narratives_scoreId_idx" ON "score_narratives"("scoreId");
CREATE INDEX "reference_requests_profileId_idx" ON "reference_requests"("profileId");
CREATE INDEX "timeline_events_profileId_eventDate_idx" ON "timeline_events"("profileId", "eventDate");
CREATE INDEX "data_subject_requests_profileId_status_idx" ON "data_subject_requests"("profileId", "status");
CREATE INDEX "chat_sessions_profileId_workflow_idx" ON "chat_sessions"("profileId", "workflow");
CREATE INDEX "chat_messages_sessionId_createdAt_idx" ON "chat_messages"("sessionId", "createdAt");

ALTER TABLE "identity_duplicate_flags" ADD CONSTRAINT "identity_duplicate_flags_candidateAnchorA_fkey" FOREIGN KEY ("candidateAnchorA") REFERENCES "identity_anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_duplicate_flags" ADD CONSTRAINT "identity_duplicate_flags_candidateAnchorB_fkey" FOREIGN KEY ("candidateAnchorB") REFERENCES "identity_anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_merge_requests" ADD CONSTRAINT "identity_merge_requests_primaryAnchorId_fkey" FOREIGN KEY ("primaryAnchorId") REFERENCES "identity_anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_merge_requests" ADD CONSTRAINT "identity_merge_requests_mergedAnchorId_fkey" FOREIGN KEY ("mergedAnchorId") REFERENCES "identity_anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_dispute_cases" ADD CONSTRAINT "identity_dispute_cases_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "identity_anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_identityAnchorId_fkey" FOREIGN KEY ("identityAnchorId") REFERENCES "identity_anchors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "credential_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_issuingOrgId_fkey" FOREIGN KEY ("issuingOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "education_credential_details" ADD CONSTRAINT "education_credential_details_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employment_credential_details" ADD CONSTRAINT "employment_credential_details_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_credential_details" ADD CONSTRAINT "identity_credential_details_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_credential_details" ADD CONSTRAINT "financial_credential_details_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credential_flexible_data" ADD CONSTRAINT "credential_flexible_data_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "verification_sla_configs" ADD CONSTRAINT "verification_sla_configs_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "credential_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verification_sla_configs" ADD CONSTRAINT "verification_sla_configs_orgTypeId_fkey" FOREIGN KEY ("orgTypeId") REFERENCES "organization_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_targetOrgId_fkey" FOREIGN KEY ("targetOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "verification_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_attestingOrgId_fkey" FOREIGN KEY ("attestingOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_attestingOrgMembershipId_fkey" FOREIGN KEY ("attestingOrgMembershipId") REFERENCES "org_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_attestationStandardId_fkey" FOREIGN KEY ("attestationStandardId") REFERENCES "attestation_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attestation_approvals" ADD CONSTRAINT "attestation_approvals_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "attestations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attestation_approvals" ADD CONSTRAINT "attestation_approvals_approverOrgMembershipId_fkey" FOREIGN KEY ("approverOrgMembershipId") REFERENCES "org_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attestation_revocation_events" ADD CONSTRAINT "attestation_revocation_events_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_organizationTypeId_fkey" FOREIGN KEY ("organizationTypeId") REFERENCES "organization_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_data_residency_policies" ADD CONSTRAINT "org_data_residency_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_batches" ADD CONSTRAINT "case_batches_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_batches" ADD CONSTRAINT "case_batches_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "case_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "case_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "case_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_decisionDisclaimerVersionId_fkey" FOREIGN KEY ("decisionDisclaimerVersionId") REFERENCES "consent_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_orgMembershipId_fkey" FOREIGN KEY ("orgMembershipId") REFERENCES "org_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "consent_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scoring_rule_versions" ADD CONSTRAINT "scoring_rule_versions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "score_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "score_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_rulesVersionId_fkey" FOREIGN KEY ("rulesVersionId") REFERENCES "scoring_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "score_explanation_factors" ADD CONSTRAINT "score_explanation_factors_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "score_explanation_factors" ADD CONSTRAINT "score_explanation_factors_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "score_narratives" ADD CONSTRAINT "score_narratives_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reference_requests" ADD CONSTRAINT "reference_requests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reference_invitations" ADD CONSTRAINT "reference_invitations_referenceRequestId_fkey" FOREIGN KEY ("referenceRequestId") REFERENCES "reference_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reference_responses" ADD CONSTRAINT "reference_responses_referenceRequestId_fkey" FOREIGN KEY ("referenceRequestId") REFERENCES "reference_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reference_responses" ADD CONSTRAINT "reference_responses_respondingUserId_fkey" FOREIGN KEY ("respondingUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reference_verifications" ADD CONSTRAINT "reference_verifications_referenceResponseId_fkey" FOREIGN KEY ("referenceResponseId") REFERENCES "reference_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_sourceCredentialId_fkey" FOREIGN KEY ("sourceCredentialId") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
