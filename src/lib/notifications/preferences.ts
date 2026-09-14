export function communicationPreferences(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    emailImportant: raw.emailImportant !== false,
    emailGeneral: raw.emailGeneral !== false,
    whatsappImportant: raw.whatsappImportant === true,
    inAppAll: true,
  };
}

export function shouldSendStudentEmail(profile: { communicationPreferences?: unknown } | null | undefined, important = true) {
  const prefs = communicationPreferences(profile?.communicationPreferences);
  return important ? prefs.emailImportant : prefs.emailGeneral;
}
