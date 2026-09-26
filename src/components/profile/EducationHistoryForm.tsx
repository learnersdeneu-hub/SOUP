"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { saveEducationHistory } from "@/app/actions/coreProfile";
import type { AcademicHonor, EducationHistory, PriorInstitution } from "@/lib/applications/coreProfile";
import { ProfileSectionNav } from "@/components/profile/ProfileSectionNav";

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";
const DEGREE_LEVELS = ["Foundation / Pathway", "Bachelor's", "Master's", "PhD"];
const EDUCATION_SYSTEMS = ["A-Levels", "International Baccalaureate (IB)", "American High School Diploma", "IGCSE / O-Levels", "National Curriculum / Matriculation", "Advanced Placement (AP)", "Cambridge International"];
const OTHER_SYSTEM = "__other__";

function emptyInstitution(): PriorInstitution { return { name: "", startDate: "", endDate: "", country: "", city: "", credential: "" }; }
function emptyHonor(): AcademicHonor { return { title: "", year: "" }; }

export function EducationHistoryForm({ education }: { education: EducationHistory }) {
  const router = useRouter();
  const [currentInstitutionName, setCurrentInstitutionName] = useState(education.currentInstitutionName);
  const [currentInstitutionCity, setCurrentInstitutionCity] = useState(education.currentInstitutionCity);
  const [currentInstitutionCountry, setCurrentInstitutionCountry] = useState(education.currentInstitutionCountry);
  const [educationSystem, setEducationSystem] = useState(education.educationSystem);
  const [customSystem, setCustomSystem] = useState(() => Boolean(education.educationSystem) && !EDUCATION_SYSTEMS.includes(education.educationSystem));
  const [startDate, setStartDate] = useState(education.startDate);
  const [graduationDate, setGraduationDate] = useState(education.graduationDate);
  const [gpaValue, setGpaValue] = useState(education.gpaValue);
  const [gpaScale, setGpaScale] = useState(education.gpaScale);
  const [classRank, setClassRank] = useState(education.classRank);
  const [priorInstitutions, setPriorInstitutions] = useState<PriorInstitution[]>(education.priorInstitutions);
  const [intendedDegreeLevel, setIntendedDegreeLevel] = useState(education.intendedDegreeLevel);
  const [intendedFieldsText, setIntendedFieldsText] = useState(education.intendedFields.join(", "));
  const [honors, setHonors] = useState<AcademicHonor[]>(education.honors);
  const [counselorName, setCounselorName] = useState(education.counselorName);
  const [counselorEmail, setCounselorEmail] = useState(education.counselorEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateInstitution(index: number, patch: Partial<PriorInstitution>) {
    setPriorInstitutions((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function updateHonor(index: number, patch: Partial<AcademicHonor>) {
    setHonors((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.set("currentInstitutionName", currentInstitutionName);
      form.set("currentInstitutionCity", currentInstitutionCity);
      form.set("currentInstitutionCountry", currentInstitutionCountry);
      form.set("educationSystem", educationSystem);
      form.set("startDate", startDate);
      form.set("graduationDate", graduationDate);
      form.set("gpaValue", gpaValue);
      form.set("gpaScale", gpaScale);
      form.set("classRank", classRank);
      form.set("priorInstitutions", JSON.stringify(priorInstitutions.filter((item) => item.name.trim())));
      form.set("intendedDegreeLevel", intendedDegreeLevel);
      form.set("intendedFields", JSON.stringify(intendedFieldsText.split(",").map((v) => v.trim()).filter(Boolean)));
      form.set("honors", JSON.stringify(honors.filter((item) => item.title.trim())));
      form.set("counselorName", counselorName);
      form.set("counselorEmail", counselorEmail);
      await saveEducationHistory(form);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your education background.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Dashboard</Link>
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My Application Progress · Section 3</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Education & Academic Background</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Fill this in once — it's reused across every university application you start.</p>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Current / most recent institution</span><input value={currentInstitutionName} onChange={(e) => setCurrentInstitutionName(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">City</span><input value={currentInstitutionCity} onChange={(e) => setCurrentInstitutionCity(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Country</span><input value={currentInstitutionCountry} onChange={(e) => setCurrentInstitutionCountry(e.target.value)} className={inputClass}/></label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Education system</span>
            <select
              value={customSystem ? OTHER_SYSTEM : (EDUCATION_SYSTEMS.includes(educationSystem) ? educationSystem : "")}
              onChange={(e) => { if (e.target.value === OTHER_SYSTEM) { setCustomSystem(true); setEducationSystem(""); } else { setCustomSystem(false); setEducationSystem(e.target.value); } }}
              className={inputClass}
            >
              <option value="" disabled>Select…</option>
              {EDUCATION_SYSTEMS.map((system) => <option key={system} value={system}>{system}</option>)}
              <option value={OTHER_SYSTEM}>Other</option>
            </select>
            {customSystem && <input value={educationSystem} onChange={(e) => setEducationSystem(e.target.value)} placeholder="Name your education system" className={`${inputClass} mt-2`}/>}
          </label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Class rank (if available)</span><input value={classRank} onChange={(e) => setClassRank(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Start date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Graduation date (actual or expected)</span><input type="date" value={graduationDate} onChange={(e) => setGraduationDate(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">GPA / grade</span><input value={gpaValue} onChange={(e) => setGpaValue(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Grading scale</span><input value={gpaScale} onChange={(e) => setGpaScale(e.target.value)} placeholder="e.g. 4.0, percentage" className={inputClass}/></label>
        </div>

        <div className="border-t border-hair pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Previous institutions</span>
            <button type="button" onClick={() => setPriorInstitutions([...priorInstitutions, emptyInstitution()])} className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy"><Plus size={12}/>Add institution</button>
          </div>
          {priorInstitutions.map((item, index) => (
            <div key={index} className="mt-3 space-y-2 rounded-xl bg-paper p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={item.name} onChange={(e) => updateInstitution(index, { name: e.target.value })} placeholder="Institution name" className={inputClass}/>
                <input value={item.city} onChange={(e) => updateInstitution(index, { city: e.target.value })} placeholder="City" className={inputClass}/>
                <input value={item.country} onChange={(e) => updateInstitution(index, { country: e.target.value })} placeholder="Country" className={inputClass}/>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input type="date" value={item.startDate} onChange={(e) => updateInstitution(index, { startDate: e.target.value })} className={inputClass}/>
                <input type="date" value={item.endDate} onChange={(e) => updateInstitution(index, { endDate: e.target.value })} className={inputClass}/>
                <input value={item.credential} onChange={(e) => updateInstitution(index, { credential: e.target.value })} placeholder="Credential" className={inputClass}/>
                <button type="button" onClick={() => setPriorInstitutions(priorInstitutions.filter((_, i) => i !== index))} aria-label="Remove" className="shrink-0 text-mute hover:text-ink"><X size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Intended degree level</span>
            <div className="flex flex-wrap gap-2">{DEGREE_LEVELS.map((level) => <button key={level} type="button" onClick={() => setIntendedDegreeLevel(level)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${intendedDegreeLevel === level ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{level}</button>)}</div>
          </label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Intended field(s) of study</span><input value={intendedFieldsText} onChange={(e) => setIntendedFieldsText(e.target.value)} placeholder="Comma-separated, e.g. Computer Science, Data Science" className={inputClass}/></label>
        </div>

        <div className="border-t border-hair pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Academic honors / awards</span>
            <button type="button" onClick={() => setHonors([...honors, emptyHonor()])} className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy"><Plus size={12}/>Add honor</button>
          </div>
          {honors.map((item, index) => (
            <div key={index} className="mt-3 flex gap-2">
              <input value={item.title} onChange={(e) => updateHonor(index, { title: e.target.value })} placeholder="Honor / award" className={inputClass}/>
              <input value={item.year} onChange={(e) => updateHonor(index, { year: e.target.value })} placeholder="Year" className={`${inputClass} max-w-[100px]`}/>
              <button type="button" onClick={() => setHonors(honors.filter((_, i) => i !== index))} aria-label="Remove" className="shrink-0 text-mute hover:text-ink"><X size={14}/></button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">School counselor name</span><input value={counselorName} onChange={(e) => setCounselorName(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Counselor email</span><input value={counselorEmail} onChange={(e) => setCounselorEmail(e.target.value)} className={inputClass}/></label>
        </div>

        <div className="flex items-center gap-3 border-t border-hair pt-4">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 size={12} className="animate-spin"/>}
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-[11px] font-medium text-teal">Saved.</span>}
          {error && <span className="text-[11px] font-medium text-[#9D3127]">{error}</span>}
        </div>
      </div>
      <ProfileSectionNav current="/profile/education"/>
    </div>
  );
}
