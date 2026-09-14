export type ApplicationCoreSnapshot = {
  fullName?: string | null;
  email?: string | null;
  dateOfBirth?: Date | string | null;
  nationality?: string | null;
  currentCountry?: string | null;
  academicBackgroundSummary?: string | null;
};

export function missingCoreApplicationInformation(input: ApplicationCoreSnapshot) {
  const missing: string[] = [];
  if (!String(input.fullName || "").trim()) missing.push("full legal name");
  if (!String(input.email || "").trim()) missing.push("email address");
  if (!input.dateOfBirth) missing.push("date of birth");
  if (!String(input.nationality || "").trim()) missing.push("nationality");
  if (!String(input.currentCountry || "").trim()) missing.push("current country of residence");
  if (!String(input.academicBackgroundSummary || "").trim()) missing.push("academic background");
  return missing;
}

export function checklistMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function isStudentApprovalBlockingItem(item: { required: boolean; metadata: unknown }) {
  if (!item.required) return false;
  const metadata = checklistMetadata(item.metadata);
  return metadata.approvalBlocking !== false && String(metadata.responsibleParty || "STUDENT").toUpperCase() !== "SOUP";
}

export function isStudentActionItem(item: { metadata: unknown }) {
  const metadata = checklistMetadata(item.metadata);
  return String(metadata.responsibleParty || "STUDENT").toUpperCase() === "STUDENT";
}
