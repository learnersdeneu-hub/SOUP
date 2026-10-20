"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Plus, Send, Trash2 } from "lucide-react";
import type { Recommender } from "@prisma/client";
import { addRecommender, removeRecommender, inviteRecommender, resendInvite, setRecommendersNotRequiredConfirmed } from "@/app/actions/recommenders";

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";
const RECOMMENDER_TYPES = [["TEACHER", "Teacher"], ["COUNSELOR", "Counselor"], ["OTHER", "Other"]] as const;

const STATUS_LABEL: Record<string, string> = {
  NOT_INVITED: "Not invited",
  INVITED: "Invited",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
};
const STATUS_CLASS: Record<string, string> = {
  NOT_INVITED: "bg-[#F2F2F2] text-mute",
  INVITED: "bg-[#EAF0F5] text-navy",
  IN_PROGRESS: "bg-[#FBF4E8] text-[#6B5420]",
  SUBMITTED: "bg-[#F0F7F5] text-teal",
};

function emptyForm() {
  return { type: "TEACHER", firstName: "", lastName: "", email: "", subjectOrTitle: "", institution: "", relationshipToStudent: "", waiverAcknowledged: false };
}

export function RecommendersForm({ recommenders, recommendersNotRequiredConfirmed }: { recommenders: Recommender[]; recommendersNotRequiredConfirmed: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  async function submitAdd() {
    setBusy(true); setError(null);
    try {
      const data = new FormData();
      data.set("type", form.type);
      data.set("firstName", form.firstName);
      data.set("lastName", form.lastName);
      data.set("email", form.email);
      data.set("subjectOrTitle", form.subjectOrTitle);
      data.set("institution", form.institution);
      data.set("relationshipToStudent", form.relationshipToStudent);
      data.set("waiverAcknowledged", String(form.waiverAcknowledged));
      const result = await addRecommender(data);
      if (!result.ok) { setError(result.error); return; }
      setAdding(false);
      setForm(emptyForm());
      router.refresh();
    } finally { setBusy(false); }
  }

  async function invite(id: string) {
    setBusyId(id); setError(null);
    try {
      const data = new FormData();
      data.set("id", id);
      const result = await inviteRecommender(data);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    } finally { setBusyId(null); }
  }

  async function resend(id: string) {
    setBusyId(id); setError(null);
    try {
      const data = new FormData();
      data.set("id", id);
      const result = await resendInvite(data);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    setBusyId(id); setError(null);
    try {
      const data = new FormData();
      data.set("id", id);
      await removeRecommender(data);
      setConfirmRemoveId(null);
      router.refresh();
    } finally { setBusyId(null); }
  }

  async function toggleNotRequired(confirmed: boolean) {
    const data = new FormData();
    data.set("confirmed", String(confirmed));
    await setRecommendersNotRequiredConfirmed(data);
    router.refresh();
  }

  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Recommendations</h2>
        <p className="mt-1 text-xs leading-5 text-mute">Invite recommenders by email — they submit their letter directly through a secure link. Saved once here, then assign which recommenders go to which university in My Colleges.</p>
      </div>

      {recommenders.length > 0 && (
        <ul className="space-y-2">
          {recommenders.map((recommender) => (
            <li key={recommender.id} className="rounded-xl border border-hair bg-paper p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink">{recommender.firstName} {recommender.lastName} <span className="font-normal text-mute">· {RECOMMENDER_TYPES.find(([v]) => v === recommender.type)?.[1] || recommender.type}</span></div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-mute"><Mail size={11}/>{recommender.email}</div>
                  {(recommender.subjectOrTitle || recommender.institution) && (
                    <div className="mt-0.5 text-[11px] text-mute">{[recommender.subjectOrTitle, recommender.institution].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_CLASS[recommender.status] || STATUS_CLASS.NOT_INVITED}`}>{STATUS_LABEL[recommender.status] || recommender.status}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {recommender.status === "NOT_INVITED" && (
                  <button type="button" onClick={() => invite(recommender.id)} disabled={busyId === recommender.id} className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
                    {busyId === recommender.id ? <Loader2 size={11} className="animate-spin"/> : <Send size={11}/>}Invite
                  </button>
                )}
                {(recommender.status === "INVITED" || recommender.status === "IN_PROGRESS") && (
                  <button type="button" onClick={() => resend(recommender.id)} disabled={busyId === recommender.id} className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-1.5 text-[11px] font-semibold text-ink disabled:opacity-60">
                    {busyId === recommender.id ? <Loader2 size={11} className="animate-spin"/> : <Send size={11}/>}Resend invite
                  </button>
                )}
                {confirmRemoveId === recommender.id ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="text-mute">{recommender.status === "SUBMITTED" ? "Remove this recommender and their submitted letter?" : "Remove this recommender?"}</span>
                    <button type="button" onClick={() => remove(recommender.id)} disabled={busyId === recommender.id} className="font-semibold text-[#9D3127]">Yes, remove</button>
                    <button type="button" onClick={() => setConfirmRemoveId(null)} className="font-semibold text-ink">Cancel</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmRemoveId(recommender.id)} className="inline-flex items-center gap-1 rounded-lg p-1.5 text-mute hover:text-[#B3261E]" title="Remove"><Trash2 size={13}/></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-hair bg-paper p-3">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{RECOMMENDER_TYPES.map(([value, label]) => <button key={value} type="button" onClick={() => setForm((prev) => ({ ...prev, type: value }))} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.type === value ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{label}</button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={inputClass}/>
              <input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={inputClass}/>
            </div>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address" type="email" className={inputClass}/>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.subjectOrTitle} onChange={(e) => setForm((p) => ({ ...p, subjectOrTitle: e.target.value }))} placeholder={form.type === "TEACHER" ? "Subject taught" : "Job title"} className={inputClass}/>
              <input value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} placeholder="Institution / organization" className={inputClass}/>
            </div>
            <input value={form.relationshipToStudent} onChange={(e) => setForm((p) => ({ ...p, relationshipToStudent: e.target.value }))} placeholder="Relationship to you (e.g. taught me for 2 years)" className={inputClass}/>
            <label className="flex items-start gap-2 text-[11px] text-mute">
              <input type="checkbox" checked={form.waiverAcknowledged} onChange={(e) => setForm((p) => ({ ...p, waiverAcknowledged: e.target.checked }))} className="mt-0.5"/>
              I waive my right to read this recommendation letter.
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={submitAdd} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">{busy && <Loader2 size={12} className="animate-spin"/>}{busy ? "Saving…" : "Save recommender"}</button>
            <button type="button" onClick={() => { setAdding(false); setForm(emptyForm()); }} className="rounded-lg border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy"><Plus size={12}/>Add recommender</button>
      )}

      {recommenders.length === 0 && !adding && (
        <label className="flex items-center gap-2 text-[11px] text-mute">
          <input type="checkbox" checked={recommendersNotRequiredConfirmed} onChange={(e) => toggleNotRequired(e.target.checked)}/>
          Not required for my universities
        </label>
      )}

      {error && <div className="text-[11px] font-medium text-[#9D3127]">{error}</div>}
    </section>
  );
}
