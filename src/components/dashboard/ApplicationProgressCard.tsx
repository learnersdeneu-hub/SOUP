import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { ApplicationProgressSummary } from "@/lib/applications/progress";

// Pure server-rendered display: no client state of its own. It reflects
// whatever getCustomerDashboardData computed for this request, so it stays
// current automatically whenever the dashboard re-renders — which already
// happens after the actions that change these sections (updateCustomerProfile
// calls revalidatePath("/dashboard") on every SOUP Profile save; document
// upload and the university apply form both call router.refresh() after
// uploading or submitting). No separate polling or client sync was needed.
export function ApplicationProgressCard({ progress }: { progress: ApplicationProgressSummary }) {
  const { sections, completedCount, totalCount, percent } = progress;
  return (
    <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Application Progress</div>
          <h2 className="mt-1 text-sm font-semibold text-ink">My Application Progress</h2>
        </div>
        <div className="text-xs font-semibold text-ink">{completedCount}/{totalCount} sections complete · {percent}%</div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-paper">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Application progress"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sections.map((section) => (
          <Link
            key={section.key}
            href={section.href}
            aria-label={`${section.label} — ${section.complete ? "complete, view or edit" : "start now"}`}
            className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {section.complete
              ? <CheckCircle2 size={20} className="text-teal" />
              : <Circle size={20} className="text-hair" />}
            <span className={`text-[10px] leading-4 ${section.complete ? "font-semibold text-ink" : "text-mute"}`}>{section.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
