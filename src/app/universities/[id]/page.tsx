import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, BookOpen, CalendarDays, Coins, GraduationCap, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { knownPartnerWebsite } from "@/lib/partners/knownWebsites";
import { ApplicationNetworkPanel } from "@/components/partners/ApplicationNetworkPanel";
import { UniversityApplyPanel } from "@/components/applications/UniversityApplyPanel";
import { AddToMyCollegesButton } from "@/components/applications/AddToMyCollegesButton";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { MY_COLLEGES_CAP } from "@/lib/applications/lifecycle";
import { safeHttpUrl } from "@/lib/security/urls";
import { SourceFreshnessBadge } from "@/components/SourceFreshnessBadge";
import { summarizeUniversityPrograms } from "@/lib/universities/presentation";

function metadataLogo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const url = String((value as Record<string, unknown>).logoUrl || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

function SummaryCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-hair bg-paper/70 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[.13em] text-mute">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold leading-5 text-ink">{value}</div>
      {note ? <div className="mt-1 text-[10px] leading-4 text-mute">{note}</div> : null}
    </div>
  );
}

export default async function UniversityDetailPage({ params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  const university = await prisma.university.findUnique({
    where: { id: params.id },
    include: {
      partner: true,
      programs: {
        where: { active: true },
        orderBy: [{ level: "asc" }, { title: "asc" }],
        take: 100,
      },
    },
  });

  if (!university) notFound();

  // Checked here, server-side, so a returning student sees "continue" instead
  // of being able to start a second application to the same university by
  // mistake — /api/applications already de-duplicates on the backend, but
  // this avoids the confusing round trip of finding that out after submitting.
  const existingApplication = current?.user.profile
    ? await prisma.studentApplication.findFirst({
        where: { profileId: current.user.profile.id, universityId: university.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, ownership: true },
      })
    : null;

  // Prefills UniversityApplyPanel's form so a student is never asked for
  // something SOUP already has — the same core fields used everywhere else
  // (see missingCoreApplicationInformation), just fetched once here.
  const applicantStudentCase = current?.user.profile
    ? await prisma.studentCase.findUnique({ where: { profileId: current.user.profile.id }, select: { academicBackgroundSummary: true } })
    : null;
  const applicantPrefill = {
    fullName: current?.user.fullName || "",
    dateOfBirth: current?.user.dateOfBirth ? current.user.dateOfBirth.toISOString().slice(0, 10) : "",
    nationality: current?.user.nationality || "",
    currentCountry: current?.user.currentCountry || "",
    academicBackgroundSummary: applicantStudentCase?.academicBackgroundSummary || "",
  };

  // Separate from existingApplication above (which UniversityApplyPanel uses
  // for its own broader "have you applied at all" state): this is scoped to
  // exactly what the My Colleges cap and button state care about — active
  // SOUP-managed applications only.
  const myManagedApplications = current?.user.profile
    ? await prisma.studentApplication.findMany({
        where: { profileId: current.user.profile.id, ownership: "SOUP_MANAGED", status: { notIn: ["WITHDRAWN", "REJECTED"] } },
        select: { id: true, universityId: true, programId: true },
      })
    : [];
  const myCollegeSelection = myManagedApplications.find((a) => a.universityId === university.id) || null;
  const myCollegesCapReached = myManagedApplications.length >= MY_COLLEGES_CAP;

  const website = safeHttpUrl(university.websiteUrl, 1500)
    || safeHttpUrl(university.partner?.websiteUrl, 1500)
    || safeHttpUrl(knownPartnerWebsite(university.name), 1500);
  const summary = summarizeUniversityPrograms(university.programs);
  const levelText = summary.levels.length ? summary.levels.join(" · ") : "Live verification";
  const intakeText = summary.intakes.length ? summary.intakes.join(" · ") : "Live verification";
  const feeText = summary.feeRange || "Live verification";

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={!!current}/>
      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-6 sm:px-8 sm:pt-8">
        <Link href="/universities" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>University network</Link>

        <section className="mt-4 overflow-hidden rounded-[26px] border border-hair bg-white p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-4">
                <PartnerLogo
                  name={university.name}
                  websiteUrl={website}
                  logoUrl={metadataLogo(university.publicMetadata) || metadataLogo(university.partner?.publicMetadata)}
                  size={64}
                />
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal"><BadgeCheck size={12}/>SOUP Application Network</div>
                  <h1 className="mt-2 break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{university.name}</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-mute"><MapPin size={13}/>{[university.city, university.country].filter(Boolean).join(", ")}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {current ? (
                  <AddToMyCollegesButton
                    universityId={university.id}
                    universityName={university.name}
                    programs={university.programs.map((p) => ({ id: p.id, title: p.title, level: p.level, intake: p.intake }))}
                    initialApplication={myCollegeSelection}
                    capReached={myCollegesCapReached}
                    variant="primary"
                  />
                ) : (
                  <Link href={`/sign-up?next=${encodeURIComponent(`/universities/${university.id}`)}`} className="rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white">Add to My Colleges</Link>
                )}
                <Link
                  href={`/counselor?intent=universities&universityId=${encodeURIComponent(university.id)}&prompt=${encodeURIComponent(`Tell me whether ${university.name} is suitable for me. Verify current fees, intakes, deadlines and the best programs for my profile.`)}`}
                  className="rounded-full border border-hair px-4 py-2.5 text-xs font-semibold text-ink"
                >Ask Noodles about this university</Link>
                {website ? <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-hair px-4 py-2.5 text-xs font-semibold text-ink">Official website <ArrowUpRight size={12}/></a> : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <SourceFreshnessBadge checkedAt={university.sourceCheckedAt}/>
                <span className="text-[11px] text-mute">University-level source freshness</span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-mute">SOUP can manage eligible applications when a suitable program is selected. Fees, intakes, deadlines and entry requirements can change, so missing or stale values are verified live before you rely on them.</p>
            </div>
            <div className="min-w-0 space-y-4 lg:justify-self-end">
              <ApplicationNetworkPanel metadata={university.publicMetadata || university.partner?.publicMetadata}/>
              <UniversityApplyPanel
                universityId={university.id}
                universityName={university.name}
                programs={university.programs.map((p) => ({ id: p.id, title: p.title, level: p.level, intake: p.intake }))}
                signedIn={!!current}
                existingApplication={existingApplication}
                prefill={applicantPrefill}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Fee range" value={feeText} note={summary.feeRange ? "From active catalog programs" : "Noodles can verify current tuition"}/>
            <SummaryCard label="Intakes" value={intakeText} note={summary.intakes.length ? "From active catalog programs" : "Current intake check required"}/>
            <SummaryCard label="Study levels" value={levelText} note={summary.levels.length ? undefined : "Program-level check required"}/>
            <SummaryCard label="Programs in SOUP" value={String(summary.programCount)} note={summary.programCount ? "Current active catalog rows" : "Use live program search"}/>
          </div>
        </section>

        <section className="mt-5 rounded-[26px] border border-hair bg-white p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">Programs in SOUP</div>
              <h2 className="mt-2 text-xl font-semibold text-ink">Available catalog programs</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-mute">Only active/current catalog programs are shown here. Historical rows that require refresh stay hidden from students.</p>
            </div>
            <div className="shrink-0 text-xs text-mute">{university.programs.length} listed</div>
          </div>

          <div className="mt-5 divide-y divide-hair">
            {university.programs.map((program) => (
              <div key={program.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-ink">{program.title}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-mute">
                      <span className="inline-flex items-center gap-1"><BookOpen size={11}/>{program.level}</span>
                      {program.intake ? <span className="inline-flex items-center gap-1"><CalendarDays size={11}/>{program.intake}</span> : <span className="inline-flex items-center gap-1"><CalendarDays size={11}/>Intake: verify live</span>}
                      {program.tuitionAmount ? <span className="inline-flex items-center gap-1"><Coins size={11}/>{program.tuitionCurrency || ""} {Number(program.tuitionAmount).toLocaleString("en")} / year</span> : <span className="inline-flex items-center gap-1"><Coins size={11}/>Fee: verify live</span>}
                      {program.duration ? <span className="inline-flex items-center gap-1"><GraduationCap size={11}/>{program.duration} {/^\d+(\.\d+)?$/.test(program.duration) ? "years" : ""}</span> : null}
                    </div>
                    {program.applicationDeadline ? <div className="mt-2 text-[11px] text-mute">Saved deadline: <strong className="font-semibold text-ink">{program.applicationDeadline}</strong></div> : null}
                    <div className="mt-2"><SourceFreshnessBadge checkedAt={program.sourceCheckedAt}/></div>
                  </div>
                  <Link
                    href={`/counselor?intent=universities&universityId=${encodeURIComponent(university.id)}&prompt=${encodeURIComponent(`I want to discuss ${program.title} at ${university.name}. Check my suitability and verify the current fee, intake, deadline and requirements.`)}`}
                    className="shrink-0 self-start rounded-full border border-hair px-3 py-2 text-[11px] font-semibold text-navy"
                  >Discuss with Noodles</Link>
                </div>
              </div>
            ))}
            {!university.programs.length ? (
              <div className="py-8 text-center">
                <div className="text-sm font-semibold text-ink">Current programs are not stored yet.</div>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-mute">This does not mean the university has no programs. Noodles can check the university's current official catalog, fees, intakes and requirements for your profile.</p>
                <Link href={`/counselor?intent=universities&universityId=${encodeURIComponent(university.id)}&prompt=${encodeURIComponent(`Find current programs at ${university.name} for my profile. Verify fees, intakes, deadlines and requirements from current sources.`)}`} className="mt-4 inline-flex rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white">Search current programs</Link>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
