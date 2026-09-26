"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { saveTestingDetails } from "@/app/actions/coreProfile";
import type { TestingDetails } from "@/lib/applications/coreProfile";
import { ProfileSectionNav } from "@/components/profile/ProfileSectionNav";

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";
const ENGLISH_TESTS = ["NONE_YET", "IELTS", "TOEFL", "Duolingo", "PTE"];
const REGISTRATION_STATUSES = [["NOT_REGISTERED", "Not registered"], ["REGISTERED", "Registered"], ["TAKEN", "Taken"], ["SCORE_PENDING", "Score pending"]] as const;

export function TestingDetailsForm({ testing }: { testing: TestingDetails }) {
  const router = useRouter();
  const [englishTestType, setEnglishTestType] = useState(testing.englishTestType);
  const [englishScore, setEnglishScore] = useState(testing.englishScore);
  const [englishTestDate, setEnglishTestDate] = useState(testing.englishTestDate);
  const [englishExpiryDate, setEnglishExpiryDate] = useState(testing.englishExpiryDate);
  const [satActType, setSatActType] = useState(testing.satActType);
  const [satActScore, setSatActScore] = useState(testing.satActScore);
  const [satActDate, setSatActDate] = useState(testing.satActDate);
  const [graduateTestType, setGraduateTestType] = useState(testing.graduateTestType);
  const [graduateTestScore, setGraduateTestScore] = useState(testing.graduateTestScore);
  const [graduateTestDate, setGraduateTestDate] = useState(testing.graduateTestDate);
  const [countrySpecificExam, setCountrySpecificExam] = useState(testing.countrySpecificExam);
  const [predictedGrades, setPredictedGrades] = useState(testing.predictedGrades);
  const [registrationStatus, setRegistrationStatus] = useState(testing.registrationStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.set("englishTestType", englishTestType);
      form.set("englishScore", englishScore);
      form.set("englishTestDate", englishTestDate);
      form.set("englishExpiryDate", englishExpiryDate);
      form.set("satActType", satActType);
      form.set("satActScore", satActScore);
      form.set("satActDate", satActDate);
      form.set("graduateTestType", graduateTestType);
      form.set("graduateTestScore", graduateTestScore);
      form.set("graduateTestDate", graduateTestDate);
      form.set("countrySpecificExam", countrySpecificExam);
      form.set("predictedGrades", predictedGrades);
      form.set("registrationStatus", registrationStatus);
      await saveTestingDetails(form);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your testing details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Dashboard</Link>
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My Application Progress · Section 5</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Testing & Requirements</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Fill this in once — it's reused across every university application you start.</p>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">English proficiency test</span>
          <div className="flex flex-wrap gap-2">{ENGLISH_TESTS.map((test) => <button key={test} type="button" onClick={() => setEnglishTestType(test)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${englishTestType === test ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{test === "NONE_YET" ? "None yet" : test}</button>)}</div>
          {englishTestType !== "NONE_YET" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input value={englishScore} onChange={(e) => setEnglishScore(e.target.value)} placeholder="Score" className={inputClass}/>
              <label className="block"><span className="mb-1 block text-[9px] text-mute">Date taken</span><input type="date" value={englishTestDate} onChange={(e) => setEnglishTestDate(e.target.value)} className={inputClass}/></label>
              <label className="block"><span className="mb-1 block text-[9px] text-mute">Expiry date</span><input type="date" value={englishExpiryDate} onChange={(e) => setEnglishExpiryDate(e.target.value)} className={inputClass}/></label>
            </div>
          )}
        </div>

        <div className="border-t border-hair pt-4">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">SAT / ACT (if relevant)</span>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={satActType} onChange={(e) => setSatActType(e.target.value)} className={inputClass}><option value="">Not applicable</option><option value="SAT">SAT</option><option value="ACT">ACT</option></select>
            <input value={satActScore} onChange={(e) => setSatActScore(e.target.value)} placeholder="Score" className={inputClass}/>
            <input type="date" value={satActDate} onChange={(e) => setSatActDate(e.target.value)} className={inputClass}/>
          </div>
        </div>

        <div className="border-t border-hair pt-4">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">GRE / GMAT (if relevant)</span>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={graduateTestType} onChange={(e) => setGraduateTestType(e.target.value)} className={inputClass}><option value="">Not applicable</option><option value="GRE">GRE</option><option value="GMAT">GMAT</option></select>
            <input value={graduateTestScore} onChange={(e) => setGraduateTestScore(e.target.value)} placeholder="Score" className={inputClass}/>
            <input type="date" value={graduateTestDate} onChange={(e) => setGraduateTestDate(e.target.value)} className={inputClass}/>
          </div>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Country-specific exam (e.g. UCAS predicted grades)</span><input value={countrySpecificExam} onChange={(e) => setCountrySpecificExam(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Predicted grades</span><input value={predictedGrades} onChange={(e) => setPredictedGrades(e.target.value)} className={inputClass}/></label>
        </div>

        <div className="border-t border-hair pt-4">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Test registration status</span>
          <div className="flex flex-wrap gap-2">{REGISTRATION_STATUSES.map(([value, label]) => <button key={value} type="button" onClick={() => setRegistrationStatus(value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${registrationStatus === value ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{label}</button>)}</div>
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
      <ProfileSectionNav current="/profile/testing"/>
    </div>
  );
}
