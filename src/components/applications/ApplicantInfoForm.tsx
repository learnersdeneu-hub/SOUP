"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/account";

export type ApplicantInfoPrefill = {
  fullName: string;
  dateOfBirth: string; // "" or "YYYY-MM-DD"
  nationality: string;
  currentCountry: string;
  academicBackgroundSummary: string;
};

// An always-editable version of the "Core application information" section:
// previously this either showed a static readout of already-saved fields, or
// — if anything was missing — only a link out to /account or a Noodles
// conversation, with no way to add or update the information on this page
// itself. This saves through the same updateCustomerProfile action /account
// uses, so it's the same data everywhere, not a second copy — editing it
// here updates the student's profile, which is why it also shows up
// correctly on every other application and on /account.
export function ApplicantInfoForm({ prefill }: { prefill: ApplicantInfoPrefill }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(prefill.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(prefill.dateOfBirth);
  const [nationality, setNationality] = useState(prefill.nationality);
  const [currentCountry, setCurrentCountry] = useState(prefill.currentCountry);
  const [academicBackgroundSummary, setAcademicBackgroundSummary] = useState(prefill.academicBackgroundSummary);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.set("fullName", fullName);
      form.set("dateOfBirth", dateOfBirth);
      form.set("nationality", nationality);
      form.set("currentCountry", currentCountry);
      form.set("academicBackgroundSummary", academicBackgroundSummary);
      await updateCustomerProfile(form);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your information.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Full legal name</span>
          <input value={fullName} onChange={(e) => { setFullName(e.target.value); setSaved(false); }} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Date of birth</span>
          <input type="date" value={dateOfBirth} onChange={(e) => { setDateOfBirth(e.target.value); setSaved(false); }} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Nationality</span>
          <input value={nationality} onChange={(e) => { setNationality(e.target.value); setSaved(false); }} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Current country of residence</span>
          <input value={currentCountry} onChange={(e) => { setCurrentCountry(e.target.value); setSaved(false); }} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Academic background</span>
        <textarea
          value={academicBackgroundSummary}
          onChange={(e) => { setAcademicBackgroundSummary(e.target.value); setSaved(false); }}
          rows={3}
          placeholder="e.g. A-Levels: Maths, Physics, Chemistry — predicted AAB at Aitchison College"
          className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs leading-5 text-ink outline-none focus:border-navy/40"
        />
        <span className="mt-1 block text-[10px] leading-4 text-mute">Add to this any time — new qualifications, updated grades, anything relevant. It saves here and reflects across your other applications and in Noodles, since it's the same saved profile everywhere.</span>
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 size={12} className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-[11px] font-medium text-teal">Saved.</span>}
        {error && <span className="text-[11px] font-medium text-[#9D3127]">{error}</span>}
      </div>
    </div>
  );
}
