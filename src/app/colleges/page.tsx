import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, GraduationCap, TriangleAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { deadlineUrgency, MY_COLLEGES_CAP } from "@/lib/applications/lifecycle";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function nice(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default async function CollegesPage() {
  const { profile } = await requireProfile();
  const applications = await prisma.studentApplication.findMany({
    where: { profileId: profile.id, ownership: "SOUP_MANAGED", status: { notIn: ["WITHDRAWN", "REJECTED"] } },
    orderBy: [{ deadlineAt: "asc" }, { createdAt: "desc" }],
    include: {
      university: true,
      program: true,
      checklists: { where: { kind: "ADMISSION" }, include: { items: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  const slotsUsed = applications.length;
  const slotsRemaining = Math.max(0, MY_COLLEGES_CAP - slotsUsed);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My SOUP</div>
            <h1 className="mt-1 text-2xl font-semibold text-ink">My Colleges</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Up to {MY_COLLEGES_CAP} universities SOUP manages for you at a time. Your Profile & Details, Funding, Education and Testing sections are reused automatically here — you only see what's genuinely specific to each school.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-hair bg-white px-4 py-3 text-center">
            <div className="text-lg font-semibold text-ink">{slotsUsed}/{MY_COLLEGES_CAP}</div>
            <div className="text-[10px] uppercase tracking-[.1em] text-mute">selected</div>
          </div>
        </div>

        {slotsRemaining > 0 && (
          <Link href="/universities" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-hair bg-white p-4 text-sm font-semibold text-navy hover:border-navy/40">
            {slotsUsed === 0 ? "Select your first university" : `Select another university (${slotsRemaining} slot${slotsRemaining === 1 ? "" : "s"} left)`}
            <ArrowRight size={14} />
          </Link>
        )}
        {slotsRemaining === 0 && (
          <div className="mt-4 rounded-2xl border border-hair bg-[#FFFDF7] p-4 text-xs leading-5 text-[#80651A]">You're tracking {MY_COLLEGES_CAP} universities, the current limit for SOUP-managed applications. Withdraw one from an application page to free up a slot before adding another.</div>
        )}

        <div className="mt-6 space-y-4">
          {applications.map((application) => {
            const checklist = application.checklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
            const items = checklist?.items || [];
            const requiredItems = items.filter((item) => item.required && item.status !== "NOT_APPLICABLE");
            const completeItems = requiredItems.filter((item) => ["COMPLETE", "DOCUMENT_UPLOADED"].includes(item.status));
            const percent = requiredItems.length ? Math.round((completeItems.length / requiredItems.length) * 100) : 0;
            const urgency = deadlineUrgency(application.deadlineAt);
            const flaggedItems = items.filter((item) => {
              const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
              return metadata.belowThreshold === true;
            });

            return (
              <div key={application.id} className="rounded-2xl border border-hair bg-white p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal"><GraduationCap size={12} />{nice(application.status)}</div>
                    <h2 className="mt-1 truncate text-lg font-semibold text-ink">{application.university?.name || "University application"}</h2>
                    <div className="mt-1 text-xs text-mute">{application.program ? `${application.program.title} · ${application.program.level}` : "Program not yet set"}{application.intake ? ` · ${application.intake}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-ink">{percent}%</div>
                    <div className="text-[10px] text-mute">{completeItems.length}/{requiredItems.length || 0} requirements</div>
                    {application.deadlineAt && <div className="mt-1 text-[10px] font-medium text-mute">{urgency.label}</div>}
                  </div>
                </div>

                {flaggedItems.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {flaggedItems.map((item) => {
                      const metadata = item.metadata as Record<string, unknown>;
                      return (
                        <div key={item.id} className="flex items-start gap-2 rounded-xl bg-[#FFF3F0] p-3 text-[11px] leading-5 text-[#9D3127]">
                          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                          <span>{String(metadata.thresholdFlagMessage || `${item.title} does not yet meet this program's requirement.`)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!checklist ? (
                  <div className="mt-4 rounded-xl bg-paper p-4 text-xs text-mute">Requirements haven't been prepared for this application yet. <Link href={`/applications/${application.id}`} className="font-semibold text-navy">Open the application</Link> to generate them.</div>
                ) : (
                  <div className="mt-4 divide-y divide-hair">
                    {items.slice(0, 8).map((item) => {
                      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
                      const complete = ["COMPLETE", "DOCUMENT_UPLOADED"].includes(item.status);
                      const autoSatisfied = metadata.autoSatisfiedFromCoreProfile === true;
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2.5">
                          {complete ? <CheckCircle2 size={16} className="shrink-0 text-teal" /> : <Circle size={16} className="shrink-0 text-hair" />}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-ink">{item.title}</div>
                            {autoSatisfied && <div className="text-[10px] text-teal">Already satisfied from your SOUP profile</div>}
                          </div>
                          {!complete && <Link href={`/applications/${application.id}`} className="shrink-0 text-[11px] font-semibold text-navy">Handle <ArrowRight size={10} className="ml-0.5 inline" /></Link>}
                        </div>
                      );
                    })}
                    {items.length > 8 && <div className="pt-2 text-[11px] text-mute">+{items.length - 8} more on the full application page.</div>}
                  </div>
                )}

                <Link href={`/applications/${application.id}`} className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open full application</Link>
              </div>
            );
          })}

          {applications.length === 0 && (
            <div className="rounded-2xl border border-hair bg-white p-8 text-center">
              <GraduationCap size={22} className="mx-auto text-mute" />
              <div className="mt-3 text-sm font-semibold text-ink">No universities selected yet</div>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-mute">Browse your matches or the full catalogue and select up to {MY_COLLEGES_CAP} — SOUP will build each one's requirements checklist and reuse your saved profile automatically.</p>
              <Link href="/universities" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Browse universities</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
