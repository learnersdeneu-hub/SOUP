import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, FileCheck2, ListChecks, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { JourneyItemAction } from "@/components/journey/JourneyItemAction";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl, safeResearchSources } from "@/lib/security/urls";
import { isSupersededChecklist } from "@/lib/journey/checklists";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function pretty(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function supplied(status: string) {
  return status === "DOCUMENT_UPLOADED" || status === "COMPLETE" || status === "NOT_APPLICABLE";
}

function sourceLinks(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [] as { title: string; url: string }[];
  return safeResearchSources((snapshot as Record<string, unknown>).groundingSources, 8);
}


export default async function JourneyPage() {
  const { profile } = await requireProfile();
  const recentChecklists = await prisma.journeyChecklist.findMany({
    where: { profileId: profile.id },
    include: { items: { orderBy: { position: "asc" }, include: { document: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const checklists = recentChecklists.filter((checklist) => !isSupersededChecklist(checklist.sourceSnapshot)).slice(0, 20);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">My SOUP</div>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Journey checklists</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Official-source admission, visa and pre-departure requirements saved in your SOUP case. A supplied document means SOUP has it; it is not a statement of university, embassy or authority approval.</p>
          </div>
          <Link href="/counselor" className="rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white">Continue with Counselor</Link>
        </div>

        {!checklists.length ? (
          <section className="mt-6 rounded-2xl border border-hair bg-white p-8 text-center">
            <ListChecks className="mx-auto text-navy" size={24}/>
            <h2 className="mt-3 text-base font-semibold text-ink">No journey checklist yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-mute">When your admission, visa or travel stage is clear, the Counselor can research the current official requirements and save them here.</p>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {checklists.map((checklist) => {
              const done = checklist.items.filter((item) => supplied(item.status)).length;
              const sources = sourceLinks(checklist.sourceSnapshot);
              return (
                <section key={checklist.id} className="overflow-hidden rounded-2xl border border-hair bg-white">
                  <div className="border-b border-hair p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal"><ShieldCheck size={14}/>{pretty(checklist.kind)}</div>
                        <h2 className="mt-2 text-lg font-semibold text-ink">{checklist.title}</h2>
                        <div className="mt-1 text-xs text-mute">{checklist.destinationCountry || "Destination-specific"}{checklist.authorityName ? ` · ${checklist.authorityName}` : ""}</div>
                      </div>
                      <div className="rounded-xl bg-[#F7F8FA] px-4 py-3 text-right"><div className="text-lg font-semibold text-ink">{done}/{checklist.items.length}</div><div className="text-[11px] text-mute">supplied / completed</div></div>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ECEEF1]"><div className="h-full bg-teal" style={{ width: `${checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0}%` }}/></div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-mute">
                      {checklist.sourceCheckedAt && <span>Source checked {checklist.sourceCheckedAt.toLocaleDateString()}</span>}
                      {safeHttpUrl(checklist.sourceUrl) && <a href={safeHttpUrl(checklist.sourceUrl)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy">Official source <ArrowUpRight size={11}/></a>}
                    </div>
                    {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border border-hair bg-paper px-2.5 py-1 text-[10px] font-semibold text-navy"><span className="max-w-[240px] truncate">{source.title}</span><ArrowUpRight size={9}/></a>)}</div>}
                  </div>

                  <div className="divide-y divide-hair">
                    {checklist.items.map((item) => {
                      const isDone = supplied(item.status);
                      const hasDocument = Boolean(item.documentId);
                      return (
                        <div key={item.id} className="p-5 sm:px-6">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${isDone ? "text-teal" : "text-mute"}`}>{isDone ? <CheckCircle2 size={17}/> : <Circle size={17}/>}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-ink">{item.title}</h3>{item.required && <span className="rounded-full bg-[#F7F8FA] px-2 py-0.5 text-[10px] font-semibold text-mute">Required</span>}</div>
                              {item.description && <p className="mt-1 text-xs leading-5 text-mute">{item.description}</p>}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDone ? "bg-[#F0F7F5] text-teal" : "bg-[#F7F8FA] text-mute"}`}>{hasDocument ? "Supplied in SOUP" : pretty(item.status)}</span>
                                {hasDocument && <span className="inline-flex items-center gap-1 text-[11px] text-mute"><FileCheck2 size={11}/>{item.document?.originalFileName || "Document saved"}</span>}
                                {safeHttpUrl(item.externalActionUrl) && <a href={safeHttpUrl(item.externalActionUrl)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-hair px-3 py-1.5 text-[11px] font-semibold text-navy">{item.externalActionLabel || "Official instructions"}<ArrowUpRight size={11}/></a>}
                                {checklist.kind === "ADMISSION" && item.status === "DOCUMENT_UPLOADED" && <span className="text-[10px] font-semibold text-mute">Awaiting SOUP admissions review</span>}
                                {checklist.kind !== "ADMISSION" && !hasDocument && (item.status === "ACTION_REQUIRED" || item.status === "COMPLETE") && <JourneyItemAction itemId={item.id} complete={item.status === "COMPLETE"}/>}
                                {checklist.kind === "ADMISSION" && checklist.applicationId && !hasDocument && <Link href={`/applications/${checklist.applicationId}`} className="rounded-full border border-hair px-3 py-1.5 text-[11px] font-semibold text-navy">Open application</Link>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
