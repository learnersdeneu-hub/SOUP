export type FreshnessState = "CURRENT" | "AGING" | "STALE" | "UNKNOWN";

export function sourceFreshness(date: Date | string | null | undefined, currentDays = 60, staleDays = 120): {
  state: FreshnessState;
  label: string;
  daysOld: number | null;
} {
  if (!date) return { state: "UNKNOWN", label: "Needs verification", daysOld: null };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { state: "UNKNOWN", label: "Needs verification", daysOld: null };
  const daysOld = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (daysOld <= currentDays) return { state: "CURRENT", label: `Verified ${daysOld}d ago`, daysOld };
  if (daysOld <= staleDays) return { state: "AGING", label: `Recheck advised · ${daysOld}d old`, daysOld };
  return { state: "STALE", label: `Refresh required · ${daysOld}d old`, daysOld };
}

export function deadlineStatus(date: Date | string | null | undefined) {
  if (!date) return { level: "UNKNOWN" as const, label: "Deadline not confirmed", days: null as number | null };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { level: "UNKNOWN" as const, label: "Deadline not confirmed", days: null as number | null };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { level: "MISSED" as const, label: "Deadline passed", days };
  if (days <= 3) return { level: "CRITICAL" as const, label: `${days} day${days === 1 ? "" : "s"} left · urgent`, days };
  if (days <= 7) return { level: "HIGH" as const, label: `${days} days left · high priority`, days };
  if (days <= 21) return { level: "SOON" as const, label: `${days} days left`, days };
  return { level: "OK" as const, label: `${days} days left`, days };
}
