"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, Loader2, Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import type { StudentActivity } from "@prisma/client";
import { addActivity, updateActivity, removeActivity, reorderActivity, setNoActivitiesConfirmed } from "@/app/actions/activities";
import { ACTIVITY_TYPES, MAX_ACTIVITIES, ACTIVITY_DESCRIPTION_MAX_CHARS } from "@/lib/applications/activityTypes";
import { UploadBox } from "@/components/documents/UploadBox";
import { CATEGORY_CONFIG } from "@/lib/documents/categories";
import type { CategoryDocument } from "@/lib/documents/categoryQuery";

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";

type DraftActivity = {
  activityType: string;
  roleTitle: string;
  organization: string;
  description: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  hoursPerWeek: string;
  weeksPerYear: string;
};

function emptyDraft(): DraftActivity {
  return { activityType: ACTIVITY_TYPES[0], roleTitle: "", organization: "", description: "", startDate: "", endDate: "", ongoing: false, hoursPerWeek: "", weeksPerYear: "" };
}
function draftFromActivity(activity: StudentActivity): DraftActivity {
  return {
    activityType: activity.activityType,
    roleTitle: activity.roleTitle || "",
    organization: activity.organization || "",
    description: activity.description || "",
    startDate: activity.startDate || "",
    endDate: activity.endDate || "",
    ongoing: activity.ongoing,
    hoursPerWeek: activity.hoursPerWeek != null ? String(activity.hoursPerWeek) : "",
    weeksPerYear: activity.weeksPerYear != null ? String(activity.weeksPerYear) : "",
  };
}

function ActivityFields({ draft, onChange }: { draft: DraftActivity; onChange: (patch: Partial<DraftActivity>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[.1em] text-mute">Activity type</span>
          <select value={draft.activityType} onChange={(e) => onChange({ activityType: e.target.value })} className={inputClass}>
            {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[.1em] text-mute">Position / role</span><input value={draft.roleTitle} onChange={(e) => onChange({ roleTitle: e.target.value })} className={inputClass}/></label>
      </div>
      <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[.1em] text-mute">Organization</span><input value={draft.organization} onChange={(e) => onChange({ organization: e.target.value })} className={inputClass}/></label>
      <label className="block">
        <span className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[.1em] text-mute"><span>Description</span><span>{draft.description.length}/{ACTIVITY_DESCRIPTION_MAX_CHARS}</span></span>
        <textarea value={draft.description} maxLength={ACTIVITY_DESCRIPTION_MAX_CHARS} onChange={(e) => onChange({ description: e.target.value })} rows={2} className={inputClass}/>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[9px] text-mute">Start date</span><input type="date" value={draft.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={inputClass}/></label>
        <div>
          <label className="block"><span className="mb-1 block text-[9px] text-mute">End date</span><input type="date" value={draft.endDate} disabled={draft.ongoing} onChange={(e) => onChange({ endDate: e.target.value })} className={`${inputClass} disabled:opacity-50`}/></label>
          <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-mute"><input type="checkbox" checked={draft.ongoing} onChange={(e) => onChange({ ongoing: e.target.checked })}/>Ongoing</label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[9px] text-mute">Hours per week</span><input type="number" min={0} max={168} value={draft.hoursPerWeek} onChange={(e) => onChange({ hoursPerWeek: e.target.value })} className={inputClass}/></label>
        <label className="block"><span className="mb-1 block text-[9px] text-mute">Weeks per year</span><input type="number" min={0} max={52} value={draft.weeksPerYear} onChange={(e) => onChange({ weeksPerYear: e.target.value })} className={inputClass}/></label>
      </div>
    </div>
  );
}

function toFormData(draft: DraftActivity): FormData {
  const form = new FormData();
  form.set("activityType", draft.activityType);
  form.set("roleTitle", draft.roleTitle);
  form.set("organization", draft.organization);
  form.set("description", draft.description);
  form.set("startDate", draft.startDate);
  form.set("endDate", draft.endDate);
  form.set("ongoing", String(draft.ongoing));
  form.set("hoursPerWeek", draft.hoursPerWeek);
  form.set("weeksPerYear", draft.weeksPerYear);
  return form;
}

export function ActivitiesForm({
  activities,
  noActivitiesConfirmed,
  resumeDocuments,
  readyResumeCount,
}: {
  activities: StudentActivity[];
  noActivitiesConfirmed: boolean;
  resumeDocuments: CategoryDocument[];
  readyResumeCount: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftActivity>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftActivity>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAdd() {
    setBusy(true); setError(null);
    try {
      await addActivity(toFormData(addDraft));
      setAdding(false);
      setAddDraft(emptyDraft());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that activity.");
    } finally { setBusy(false); }
  }

  async function submitEdit(id: string) {
    setBusy(true); setError(null);
    try {
      const form = toFormData(editDraft);
      form.set("id", id);
      await updateActivity(form);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that activity.");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.set("id", id);
      await removeActivity(form);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that activity.");
    } finally { setBusy(false); }
  }

  async function move(id: string, direction: "up" | "down") {
    const form = new FormData();
    form.set("id", id);
    form.set("direction", direction);
    await reorderActivity(form);
    router.refresh();
  }

  async function toggleNoActivities(confirmed: boolean) {
    const form = new FormData();
    form.set("confirmed", String(confirmed));
    await setNoActivitiesConfirmed(form);
    router.refresh();
  }

  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Activities</h2>
        <p className="mt-1 text-xs leading-5 text-mute">Clubs, sports, jobs, volunteering, research — up to {MAX_ACTIVITIES} activities, reused across every application.</p>
      </div>

      {activities.length > 0 && (
        <ul className="space-y-2">
          {activities.map((activity, index) => (
            <li key={activity.id} className="rounded-xl border border-hair bg-paper p-3">
              {editingId === activity.id ? (
                <div className="space-y-3">
                  <ActivityFields draft={editDraft} onChange={(patch) => setEditDraft((prev) => ({ ...prev, ...patch }))}/>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => submitEdit(activity.id)} disabled={busy} className="rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink">{activity.roleTitle || activity.activityType}{activity.organization ? ` · ${activity.organization}` : ""}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[.08em] text-mute">{activity.activityType}{activity.hoursPerWeek ? ` · ${activity.hoursPerWeek} hrs/wk` : ""}{activity.weeksPerYear ? ` · ${activity.weeksPerYear} wks/yr` : ""}</div>
                    {activity.description && <p className="mt-1.5 text-xs leading-5 text-ink">{activity.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => move(activity.id, "up")} disabled={index === 0} className="rounded-md p-1 text-mute hover:bg-white hover:text-navy disabled:opacity-30" title="Move up"><ArrowUp size={13}/></button>
                    <button type="button" onClick={() => move(activity.id, "down")} disabled={index === activities.length - 1} className="rounded-md p-1 text-mute hover:bg-white hover:text-navy disabled:opacity-30" title="Move down"><ArrowDown size={13}/></button>
                    <button type="button" onClick={() => { setEditingId(activity.id); setEditDraft(draftFromActivity(activity)); }} className="rounded-md p-1 text-mute hover:bg-white hover:text-navy" title="Edit"><Pencil size={13}/></button>
                    <button type="button" onClick={() => remove(activity.id)} disabled={busy} className="rounded-md p-1 text-mute hover:bg-white hover:text-[#B3261E] disabled:opacity-50" title="Remove"><Trash2 size={13}/></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-hair bg-paper p-3">
          <ActivityFields draft={addDraft} onChange={(patch) => setAddDraft((prev) => ({ ...prev, ...patch }))}/>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={submitAdd} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">{busy && <Loader2 size={12} className="animate-spin"/>}{busy ? "Adding…" : "Add activity"}</button>
            <button type="button" onClick={() => { setAdding(false); setAddDraft(emptyDraft()); }} className="rounded-lg border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink">Cancel</button>
          </div>
        </div>
      ) : (
        activities.length < MAX_ACTIVITIES && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy"><Plus size={12}/>Add activity</button>
        )
      )}

      {activities.length === 0 && !adding && (
        <label className="flex items-center gap-2 text-[11px] text-mute">
          <input type="checkbox" checked={noActivitiesConfirmed} onChange={(e) => toggleNoActivities(e.target.checked)}/>
          I have no activities to add
        </label>
      )}

      {error && <div className="text-[11px] font-medium text-[#9D3127]">{error}</div>}

      <div className="border-t border-hair pt-4">
        {readyResumeCount > 0 && resumeDocuments.length === 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-[#F0F7F5] p-3 text-xs text-teal">
            <Sparkles size={14} className="mt-0.5 shrink-0"/>
            <span>Your SOUP-built resume already satisfies this requirement. <Link href="/resume/manage" className="font-semibold underline">View it</Link>, or upload a different file below if you'd rather use that instead.</span>
          </div>
        )}
        <UploadBox category="RESUME_CV" label={CATEGORY_CONFIG.RESUME_CV.label} required={readyResumeCount === 0} existing={resumeDocuments}/>
      </div>
    </section>
  );
}
