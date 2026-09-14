"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileUp, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { saveResume } from "@/app/actions/resume";
import type { GeneratedResume, ResumeTemplateKey } from "@/lib/resume/types";

const STORAGE_KEY = "soup_pending_resume_v1";
const TEMPLATES: Array<[ResumeTemplateKey, string]> = [["STUDENT","Student"],["GRADUATE","Graduate"],["PROFESSIONAL","Professional"],["INTERNATIONAL_STUDENT","International Student"],["JOB_SEEKER","Job Seeker"]];

export function ResumeImport({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState<ResumeTemplateKey>("JOB_SEEKER");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!signedIn) return;
    const pending = window.localStorage.getItem(STORAGE_KEY);
    if (!pending) return;
    try { setResult(JSON.parse(pending) as GeneratedResume); } catch { window.localStorage.removeItem(STORAGE_KEY); }
  }, [signedIn]);

  async function analyze() {
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/resume/improve")}`); return; }
    if (!file || !targetRole.trim()) return setError("Choose your resume and enter the role or direction you want to target.");
    setError(""); setLoading(true);
    try {
      const form = new FormData(); form.set("file", file); form.set("template", template); form.set("targetRole", targetRole);
      const response = await fetch("/api/resume/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not analyze this resume.");
      setResult({ content: data.content, coverLetter: data.coverLetter, previewTips: data.previewTips });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not analyze this resume."); }
    finally { setLoading(false); }
  }

  function convert() {
    if (!result) return;
    if (!signedIn) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      router.push("/sign-up?next=/resume/improve?claim=1");
      return;
    }
    startSaving(async () => {
      try {
        const saved = await saveResume(result);
        window.localStorage.removeItem(STORAGE_KEY);
        router.push(`/resume/manage?id=${saved.id}&imported=1`);
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save this resume."); }
    });
  }

  return <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
    <aside className="space-y-4"><div className="rounded-2xl border border-hair bg-white p-5"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Improve Your Resume</div><h1 className="mt-2 text-xl font-semibold text-ink">Bring the resume you already have.</h1><p className="mt-2 text-sm leading-6 text-mute">Talk and explore freely. Because a resume is a private document, SOUP asks you to create or sign in to an account at the moment you upload it. After that, SOUP can extract it, improve it and create downloadable resume and cover-letter files.</p></div><div className="rounded-2xl border border-[#DCE6EF] bg-[#F6F9FC] p-4"><div className="flex gap-2"><LockKeyhole size={15} className="mt-0.5 text-navy"/><div><div className="text-xs font-semibold text-ink">Your full improvement plan is separate</div><p className="mt-1 text-xs leading-5 text-mute">This free analysis intentionally shows only a few tips. The Noodles can help you keep improving this resume for a particular application or destination.</p></div></div></div></aside>
    <section className="space-y-5">{error && <div className="rounded-xl border border-[#E8C6C2] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9B2C22]">{error}</div>}{!result ? <div className="rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><FileUp size={16} className="text-navy"/><h2 className="text-base font-semibold text-ink">Upload your current resume</h2></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Resume file</span><input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" onClick={(e)=>{ if (!signedIn) { e.preventDefault(); router.push(`/sign-up?next=${encodeURIComponent("/resume/improve")}`); } }} onChange={(e)=>{ if (!signedIn) { e.currentTarget.value = ""; router.push(`/sign-up?next=${encodeURIComponent("/resume/improve")}`); return; } setFile(e.target.files?.[0]||null); }} className="block w-full rounded-xl border border-hair p-3 text-xs text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF0F5] file:px-3 file:py-2 file:text-xs file:font-medium file:text-navy"/><span className="mt-1 block text-[11px] text-mute">Maximum 8 MB. Image resumes use OCR.</span></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Target role or direction</span><input value={targetRole} onChange={(e)=>setTargetRole(e.target.value)} placeholder="e.g. Graduate Finance Analyst" className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy"/></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Convert to SOUP template</span><select value={template} onChange={(e)=>setTemplate(e.target.value as ResumeTemplateKey)} className="w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-sm outline-none">{TEMPLATES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><div className="mt-6 flex justify-end"><button disabled={loading} onClick={analyze} className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading?<Loader2 size={14} className="animate-spin"/>:<Sparkles size={14}/>} {loading?"Reading and analyzing...":signedIn?"Analyze resume":"Create account to upload"}</button></div></div> : <><div className="rounded-2xl border border-hair bg-white p-5"><div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">Free analysis</div><h2 className="mt-2 text-lg font-semibold text-ink">{result.content.personal.fullName}</h2><p className="mt-1 text-sm text-navy">{result.content.personal.headline}</p><p className="mt-3 text-sm leading-6 text-mute">{result.content.personal.summary}</p><div className="mt-4 flex flex-wrap gap-1.5">{result.content.skills.slice(0,10).map((s)=><span key={s} className="rounded-full bg-[#F1F4F7] px-2 py-1 text-[11px] text-ink">{s}</span>)}</div></div><div className="rounded-2xl border border-[#D9E7E3] bg-[#F4FAF8] p-5"><div className="flex items-center gap-2"><Sparkles size={15} className="text-teal"/><h3 className="text-sm font-semibold text-ink">A few ways to strengthen it</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{result.previewTips.map((tip,i)=><div key={i} className="rounded-xl bg-white p-3"><div className="text-xs font-semibold text-ink">{tip.title}</div><div className="mt-1 text-[11px] leading-5 text-mute">{tip.why}</div></div>)}</div></div><div className="flex flex-wrap justify-between gap-2"><button onClick={()=>setResult(null)} className="rounded-xl border border-hair px-4 py-2.5 text-sm font-medium text-ink">Use another file</button><button disabled={saving} onClick={convert} className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving?<Loader2 size={14} className="animate-spin"/>:<ArrowRight size={14}/>} {signedIn?"Convert & save to My SOUP":"Create account & convert"}</button></div></>}</section>
  </div>;
}
