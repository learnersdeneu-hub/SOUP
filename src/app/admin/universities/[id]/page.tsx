import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { updateUniversity, createProgram, updateProgram } from "@/app/actions/universities";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function metadataLogoUrl(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const url = String((value as Record<string, unknown>).logoUrl || "").trim();
  return url;
}

function feeFromRequirements(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { amount: "", currency: "" };
  const record = value as Record<string, unknown>;
  const amount = record.applicationFeeAmount;
  const currency = record.applicationFeeCurrency;
  return {
    amount: typeof amount === "number" ? String(amount) : "",
    currency: typeof currency === "string" ? currency : "",
  };
}

const inputClass = "rounded-xl border border-hair px-3 py-2.5 text-sm";
const labelClass = "block text-sm font-medium text-ink";

export default async function AdminUniversityDetailPage({ params }: { params: { id: string } }) {
  const current = await requireRole(ADMIN_ROLES);
  const university = await prisma.university.findUnique({
    where: { id: params.id },
    include: { partner: true, programs: { orderBy: [{ active: "desc" }, { level: "asc" }, { title: "asc" }] } },
  });
  if (!university) notFound();

  const saveUniversity = updateUniversity.bind(null, university.id);
  const addProgram = createProgram.bind(null, university.id);
  const logoUrl = metadataLogoUrl(university.publicMetadata);

  return <div className="min-h-screen bg-paper"><Header signedIn role={current.user.role}/><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
    <Link href="/admin/universities" className="text-sm font-semibold text-navy">← University catalog</Link>

    <div className="mt-5 rounded-[28px] border border-hair bg-white p-6 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">University settings</div>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{university.name}</h1>
      <p className="mt-2 text-sm leading-6 text-mute">{university.programs.length} program{university.programs.length === 1 ? "" : "s"} · {university.partner ? `Applications: ${university.partner.status}` : "Not SOUP-managed yet"}</p>

      <form action={saveUniversity} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Name<input name="name" required defaultValue={university.name} className={`mt-1 w-full ${inputClass}`}/></label>
        <label className={labelClass}>Country<input name="country" required defaultValue={university.country} className={`mt-1 w-full ${inputClass}`}/></label>
        <label className={labelClass}>City<input name="city" defaultValue={university.city || ""} className={`mt-1 w-full ${inputClass}`}/></label>
        <label className={labelClass}>Website URL<input name="websiteUrl" type="url" defaultValue={university.websiteUrl || ""} placeholder="https://..." className={`mt-1 w-full ${inputClass}`}/></label>
        <label className={`${labelClass} sm:col-span-2`}>Logo image URL<input name="logoUrl" type="url" defaultValue={logoUrl} placeholder="https://... (leave blank to fall back to favicon/initials)" className={`mt-1 w-full ${inputClass}`}/></label>

        <label className="flex items-center gap-2 text-sm text-ink"><input name="visible" type="checkbox" defaultChecked={university.isPublic !== false} className="h-4 w-4"/>Show in the student-facing catalog</label>
        <label className="flex items-center gap-2 text-sm text-ink"><input name="manageApplications" type="checkbox" defaultChecked={!!university.partner && university.partner.status === "ACTIVE"} className="h-4 w-4"/>SOUP manages applications here</label>

        {university.partner && (
          <label className={labelClass}>Application status<select name="partnerStatus" defaultValue={university.partner.status} className={`mt-1 w-full ${inputClass} bg-white`}>{["ACTIVE", "PAUSED", "INACTIVE"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        )}

        <div className="sm:col-span-2"><button className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white">Save university</button></div>
      </form>
    </div>

    <div className="mt-6 rounded-[28px] border border-hair bg-white p-6 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Programs</div>
      <h2 className="mt-1 text-lg font-semibold text-ink">Manage programs</h2>
      <p className="mt-2 text-xs leading-5 text-mute">Programs are never deleted — turn &quot;Active&quot; off instead, so existing student applications never lose their program reference.</p>

      <div className="mt-5 space-y-4">
        {university.programs.map((program) => {
          const fee = feeFromRequirements(program.requirements);
          const saveProgram = updateProgram.bind(null, program.id);
          return (
            <details key={program.id} className={`rounded-2xl border p-4 ${program.active ? "border-hair bg-paper/60" : "border-dashed border-hair bg-white opacity-70"}`}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">{program.title} — {program.level} {program.active ? "" : "(inactive)"}</summary>
              <form action={saveProgram} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input name="title" required defaultValue={program.title} placeholder="Program title" className={inputClass}/>
                <input name="level" required defaultValue={program.level} placeholder="Level (e.g. Bachelors)" className={inputClass}/>
                <input name="field" defaultValue={program.field || ""} placeholder="Field of study" className={inputClass}/>
                <input name="studyMode" defaultValue={program.studyMode || ""} placeholder="Study mode" className={inputClass}/>
                <input name="language" defaultValue={program.language || ""} placeholder="Language" className={inputClass}/>
                <input name="duration" defaultValue={program.duration || ""} placeholder="Duration" className={inputClass}/>
                <input name="intake" defaultValue={program.intake || ""} placeholder="Intake" className={inputClass}/>
                <input name="applicationDeadline" defaultValue={program.applicationDeadline || ""} placeholder="Application deadline" className={inputClass}/>
                <input name="tuitionAmount" type="number" min="0" step="0.01" defaultValue={program.tuitionAmount != null ? String(program.tuitionAmount) : ""} placeholder="Tuition amount / year" className={inputClass}/>
                <input name="tuitionCurrency" defaultValue={program.tuitionCurrency || ""} placeholder="Tuition currency (e.g. EUR)" maxLength={3} className={inputClass}/>
                <input name="applicationFeeAmount" type="number" min="0" step="0.01" defaultValue={fee.amount} placeholder="Application fee amount" className={inputClass}/>
                <input name="applicationFeeCurrency" defaultValue={fee.currency} placeholder="Application fee currency (e.g. EUR)" maxLength={3} className={inputClass}/>
                <input name="applicationUrl" type="url" defaultValue={program.applicationUrl || ""} placeholder="Application portal URL" className={`${inputClass} sm:col-span-2`}/>
                <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input name="active" type="checkbox" defaultChecked={program.active} className="h-4 w-4"/>Active (shown to students)</label>
                <div className="sm:col-span-2"><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Save program</button></div>
              </form>
            </details>
          );
        })}
        {university.programs.length === 0 && <p className="text-sm text-mute">No programs yet — add one below.</p>}
      </div>

      <details className="mt-6 rounded-2xl border border-dashed border-hair bg-paper/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Add a program</summary>
        <form action={addProgram} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Program title" className={inputClass}/>
          <input name="level" required placeholder="Level (e.g. Bachelors)" className={inputClass}/>
          <input name="field" placeholder="Field of study" className={inputClass}/>
          <input name="studyMode" placeholder="Study mode" className={inputClass}/>
          <input name="language" placeholder="Language" className={inputClass}/>
          <input name="duration" placeholder="Duration" className={inputClass}/>
          <input name="intake" placeholder="Intake" className={inputClass}/>
          <input name="applicationDeadline" placeholder="Application deadline" className={inputClass}/>
          <input name="tuitionAmount" type="number" min="0" step="0.01" placeholder="Tuition amount / year" className={inputClass}/>
          <input name="tuitionCurrency" placeholder="Tuition currency (e.g. EUR)" maxLength={3} className={inputClass}/>
          <input name="applicationFeeAmount" type="number" min="0" step="0.01" placeholder="Application fee amount" className={inputClass}/>
          <input name="applicationFeeCurrency" placeholder="Application fee currency (e.g. EUR)" maxLength={3} className={inputClass}/>
          <input name="applicationUrl" type="url" placeholder="Application portal URL" className={`${inputClass} sm:col-span-2`}/>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input name="active" type="checkbox" defaultChecked className="h-4 w-4"/>Active (shown to students)</label>
          <div className="sm:col-span-2"><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Add program</button></div>
        </form>
      </details>
    </div>
  </main></div>;
}
