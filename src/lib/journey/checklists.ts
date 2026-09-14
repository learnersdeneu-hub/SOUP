export function checklistSnapshotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function isSupersededChecklist(value: unknown) {
  const snapshot = checklistSnapshotRecord(value);
  return typeof snapshot.supersededByChecklistId === "string" && snapshot.supersededByChecklistId.trim().length > 0;
}
