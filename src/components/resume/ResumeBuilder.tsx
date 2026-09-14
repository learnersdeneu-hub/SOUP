"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { restoreResumeVersion, saveResume } from "@/app/actions/resume";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import type { GeneratedResume, ResumeContent, ResumeQuestionnaire, ResumeTemplateKey } from "@/lib/resume/types";

const STORAGE_KEY = "soup_pending_resume_v1";

type InputProps = {
  label: string;
  name: string;
  value?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
};

type TextAreaProps = {
  label: string;
  name: string;
  value?: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  hint?: string;
};

type ExistingResume = {
  id: string;
  title: string;
  updatedAt: Date | string;
  content: unknown;
  coverLetter: string | null;
  versions: Array<{ id: string; version: number }>;
};

function isResumeContent(value: unknown): value is ResumeContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const personal = candidate.personal;
  if (!personal || typeof personal !== "object" || Array.isArray(personal)) return false;
  const person = personal as Record<string, unknown>;
  return typeof candidate.template === "string"
    && typeof candidate.targetRole === "string"
    && typeof person.fullName === "string"
    && typeof person.email === "string"
    && typeof person.headline === "string"
    && typeof person.summary === "string"
    && Array.isArray(candidate.experience)
    && Array.isArray(candidate.education)
    && Array.isArray(candidate.projects)
    && Array.isArray(candidate.skills)
    && Array.isArray(candidate.achievements)
    && Array.isArray(candidate.certifications)
    && Array.isArray(candidate.languages);
}


const TEMPLATES: Array<{ key: ResumeTemplateKey; title: string; note: string }> = [
  { key: "STUDENT", title: "Student", note: "Education, projects, activities and early experience first." },
  { key: "GRADUATE", title: "Graduate", note: "Built for recent graduates moving into their first professional role." },
  { key: "PROFESSIONAL", title: "Professional", note: "Experience-led structure for established workers and specialists." },
  { key: "INTERNATIONAL_STUDENT", title: "International Student", note: "Highlights transferable skills, international exposure and study experience." },
  { key: "JOB_SEEKER", title: "Job Seeker", note: "Focused on relevance, achievements and a clear target role." },
];

const EMPTY: ResumeQuestionnaire = {
  template: "STUDENT",
  targetRole: "",
  goal: "",
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  education: "",
  experience: "",
  projects: "",
  skills: "",
  achievements: "",
  certifications: "",
  languages: "",
  additionalContext: "",
};

function Input({ label, name, value, onChange, required, placeholder, type = "text" }: InputProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">{label}{required ? " *" : ""}</span><input type={type} name={name} value={value} required={required} onChange={onChange} placeholder={placeholder} className="w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-navy" /></label>;
}

function TextArea({ label, name, value, onChange, required, placeholder, rows = 4, hint }: TextAreaProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">{label}{required ? " *" : ""}</span>{hint && <span className="mb-2 block text-xs leading-5 text-mute">{hint}</span>}<textarea name={name} value={value} required={required} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full resize-y rounded-xl border border-hair bg-white px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition focus:border-navy" /></label>;
}

function ResumePreview({ generated, photo }: { generated: GeneratedResume; photo?: string }) {
  const r = generated.content;
  return <div className="overflow-hidden rounded-2xl border border-hair bg-white shadow-sm">
    <div className="border-b border-hair px-6 py-5">
      <div className="flex items-start gap-4">
        {photo ? <img src={photo} alt="Resume portrait" className="h-16 w-16 rounded-xl object-cover" /> : null}
        <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold text-ink">{r.personal.fullName}</h2><div className="mt-1 text-sm font-medium text-navy">{r.personal.headline}</div><div className="mt-2 text-xs leading-5 text-mute">{[r.personal.email, r.personal.phone, r.personal.location, r.personal.linkedin].filter(Boolean).join(" · ")}</div></div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink">{r.personal.summary}</p>
    </div>
    <div className="grid gap-6 p-6 md:grid-cols-[1.45fr_.75fr]">
      <div className="space-y-6">
        {r.experience.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Experience</h3><div className="mt-3 space-y-4">{r.experience.map((x, i) => <div key={i}><div className="flex flex-wrap justify-between gap-1"><div className="text-sm font-semibold text-ink">{x.title} · {x.employer}</div><div className="text-xs text-mute">{[x.startDate, x.endDate].filter(Boolean).join(" – ")}</div></div><ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-mute">{x.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</div></section>}
        {r.projects.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Projects</h3><div className="mt-3 space-y-3">{r.projects.map((p, i) => <div key={i}><div className="text-sm font-semibold text-ink">{p.name}</div><div className="mt-1 text-xs leading-5 text-mute">{p.description}</div></div>)}</div></section>}
      </div>
      <div className="space-y-6">
        {r.education.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Education</h3><div className="mt-3 space-y-3">{r.education.map((e, i) => <div key={i}><div className="text-sm font-semibold text-ink">{e.qualification}{e.field ? `, ${e.field}` : ""}</div><div className="text-xs text-mute">{e.institution}</div><div className="text-xs text-mute">{[e.startDate, e.endDate].filter(Boolean).join(" – ")}</div></div>)}</div></section>}
        {r.skills.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{r.skills.map((s) => <span key={s} className="rounded-full bg-[#F1F4F7] px-2 py-1 text-[11px] text-ink">{s}</span>)}</div></section>}
        {r.achievements.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Achievements</h3><ul className="mt-2 space-y-1 text-xs leading-5 text-mute">{r.achievements.map((a, i) => <li key={i}>• {a}</li>)}</ul></section>}
        {r.certifications.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Certifications</h3><div className="mt-2 text-xs leading-5 text-mute">{r.certifications.join(" · ")}</div></section>}
        {r.languages.length > 0 && <section><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Languages</h3><div className="mt-2 text-xs leading-5 text-mute">{r.languages.join(" · ")}</div></section>}
      </div>
    </div>
  </div>;
}

export function ResumeBuilder({ signedIn, existing, selectedId, manageOnly = false }: { signedIn: boolean; existing: ExistingResume[]; selectedId?: string | null; manageOnly?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(manageOnly ? 4 : 1);
  const [answers, setAnswers] = useState<ResumeQuestionnaire>(EMPTY);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, startSaving] = useTransition();
  const [activeId, setActiveId] = useState<string | undefined>(selectedId || undefined);
  const [editing, setEditing] = useState(false);

  const activeExisting = useMemo(() => existing.find((r) => r.id === activeId) || existing[0], [existing, activeId]);

  useEffect(() => {
    if (!signedIn) return;
    const pending = window.localStorage.getItem(STORAGE_KEY);
    if (pending) {
      try {
        const parsed = JSON.parse(pending) as GeneratedResume;
        setGenerated(parsed);
        setAnswers((a) => ({ ...a, template: parsed.content.template, targetRole: parsed.content.targetRole, fullName: parsed.content.personal.fullName, email: parsed.content.personal.email }));
        setPhoto(parsed.content.personal.photoDataUrl);
        setStep(4);
      } catch {}
    } else if (activeExisting?.content && isResumeContent(activeExisting.content)) {
      const parsed: GeneratedResume = { content: activeExisting.content, coverLetter: activeExisting.coverLetter || "", previewTips: [] };
      setGenerated(parsed);
      setPhoto(parsed.content.personal.photoDataUrl);
      setStep(4);
    }
  }, [signedIn, activeExisting]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setAnswers((a) => ({ ...a, [e.target.name]: e.target.value }));
  }

  function next() {
    setError("");
    if (step === 1 && (!answers.template || !answers.targetRole.trim())) return setError("Choose a template and tell us the role or direction you are targeting.");
    if (step === 2 && (!answers.fullName.trim() || !answers.email.trim())) return setError("Your name and email are required.");
    if (step === 3 && !answers.education.trim() && !answers.experience.trim()) return setError("Add at least your education or experience so the resume has something factual to build from.");
    setStep((s) => Math.min(4, s + 1));
  }

  async function generate() {
    setError("");
    setGenerating(true);
    try {
      const response = await fetch("/api/resume/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Resume generation failed.");
      if (photo) data.content.personal.photoDataUrl = photo;
      setGenerated(data);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume generation failed.");
    } finally { setGenerating(false); }
  }

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 1_000_000) return setError("For the resume photo, please use an image under 1 MB.");
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }


  function restoreVersion(resumeId: string, versionId: string) {
    setError("");
    startSaving(async () => {
      try {
        await restoreResumeVersion(resumeId, versionId);
        setActiveId(resumeId);
        router.replace(`/resume/manage?id=${resumeId}&restored=1`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not restore that resume version.");
      }
    });
  }

  function saveFinal() {
    if (!generated) return;
    const withPhoto = { ...generated, content: { ...generated.content, personal: { ...generated.content.personal, photoDataUrl: photo } } };
    if (!signedIn) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withPhoto));
      router.push("/sign-up?next=/resume/manage?claim=1");
      return;
    }
    startSaving(async () => {
      try {
        const result = await saveResume(withPhoto, activeId);
        window.localStorage.removeItem(STORAGE_KEY);
        setActiveId(result.id);
        router.replace(`/resume/manage?id=${result.id}&saved=1`);
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save your resume."); }
    });
  }

  return <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
    <aside className="space-y-4">
      <div className="rounded-2xl border border-hair bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Resume</div>
        <h1 className="mt-2 text-xl font-semibold text-ink">{manageOnly ? "Manage your saved resume." : "Build a strong resume without starting from a blank page."}</h1>
        <p className="mt-2 text-sm leading-6 text-mute">{manageOnly ? "Edit structured fields, review versions, restore earlier work, and download the current resume or cover letter." : "Answer what you can. SOUP AI will organize only the facts you provide into the selected official template and create a concise cover letter."}</p>
        {!manageOnly && <><div className="mt-5 flex gap-1.5">{[1,2,3,4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-navy" : "bg-[#E8EAED]"}`} />)}</div><div className="mt-2 text-xs text-mute">Step {step} of 4</div></>}
      </div>
      {signedIn && existing.length > 0 && <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-sm font-semibold text-ink">Your saved resumes</div><div className="mt-3 space-y-3">{existing.slice(0,5).map((r) => <div key={r.id} className={`rounded-xl border p-3 ${activeId === r.id ? "border-navy bg-[#F5F8FB]" : "border-hair"}`}><button onClick={() => { setActiveId(r.id); router.push(`/resume/manage?id=${r.id}`); }} className="w-full text-left"><div className="truncate text-xs font-medium text-ink">{r.title}</div><div className="mt-0.5 text-[11px] text-mute">Updated {new Date(r.updatedAt).toLocaleDateString()} · {r.versions?.length ? `v${r.versions[0].version}` : "unversioned"}</div></button>{activeId === r.id && r.versions?.length > 1 ? <div className="mt-3 border-t border-hair pt-3"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-mute">Version history</div><div className="mt-2 flex flex-wrap gap-1.5">{r.versions.map((v, index)=><button key={v.id} disabled={saving || index===0} onClick={()=>restoreVersion(r.id,v.id)} title={index===0?"Current version":"Restore this version as a new version"} className={`rounded-lg border px-2 py-1 text-[10px] ${index===0?"border-navy bg-navy text-white":"border-hair bg-white text-ink hover:border-navy"}`}>v{v.version}</button>)}</div><div className="mt-1.5 text-[10px] leading-4 text-mute">Restoring an older version never deletes history; it creates a new latest version.</div></div>:null}</div>)}</div></div>}
      {!signedIn && <div className="rounded-2xl border border-[#DCE6EF] bg-[#F6F9FC] p-4"><div className="flex gap-2"><LockKeyhole size={15} className="mt-0.5 text-navy"/><div><div className="text-xs font-semibold text-ink">No account needed to start</div><div className="mt-1 text-xs leading-5 text-mute">Create your account only when you are ready to save your final resume and cover letter.</div></div></div></div>}
    </aside>

    <section className="min-w-0">
      {manageOnly && !generated && <div className="rounded-2xl border border-hair bg-white p-7 text-sm text-mute">{existing.length ? "Loading your saved resume…" : "No saved resume yet. Build one in the conversational Resume Builder first."}</div>}
      {error && <div className="mb-4 rounded-xl border border-[#E8C6C2] bg-[#FFF7F6] px-4 py-3 text-sm text-[#9B2C22]">{error}</div>}
      {step === 1 && <div className="rounded-2xl border border-hair bg-white p-5 sm:p-6"><h2 className="text-base font-semibold text-ink">What kind of resume are we building?</h2><p className="mt-1 text-xs text-mute">The structure changes; SOUP does not invent content.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{TEMPLATES.map((t) => <button key={t.key} onClick={() => setAnswers((a) => ({...a, template:t.key}))} className={`rounded-xl border p-4 text-left ${answers.template === t.key ? "border-navy bg-[#F5F8FB]" : "border-hair"}`}><div className="flex items-center justify-between"><div className="text-sm font-semibold text-ink">{t.title}</div>{answers.template === t.key && <Check size={14} className="text-teal"/>}</div><div className="mt-1 text-xs leading-5 text-mute">{t.note}</div></button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Target role or direction" name="targetRole" value={answers.targetRole} onChange={onChange} required placeholder="e.g. Data Analyst Internship"/><Input label="Main goal" name="goal" value={answers.goal} onChange={onChange} placeholder="e.g. Secure a summer internship in the UK"/></div><div className="mt-6 flex justify-end"><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white">Continue <ArrowRight size={14}/></button></div></div>}
      {step === 2 && <div className="rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><UserRound size={16} className="text-navy"/><h2 className="text-base font-semibold text-ink">Your details</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Full name" name="fullName" value={answers.fullName} onChange={onChange} required/><Input label="Email" name="email" type="email" value={answers.email} onChange={onChange} required/><Input label="Phone" name="phone" value={answers.phone} onChange={onChange}/><Input label="Location" name="location" value={answers.location} onChange={onChange} placeholder="City, Country"/><Input label="LinkedIn" name="linkedin" value={answers.linkedin} onChange={onChange}/><Input label="Portfolio / website" name="portfolio" value={answers.portfolio} onChange={onChange}/></div><label className="mt-5 block"><span className="mb-1.5 block text-xs font-medium text-ink">Optional resume picture</span><input type="file" accept="image/*" onChange={(e) => choosePhoto(e.target.files?.[0])} className="block w-full text-xs text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF0F5] file:px-3 file:py-2 file:text-xs file:font-medium file:text-navy"/><span className="mt-1 block text-[11px] text-mute">Used only on templates where you choose to include it. Maximum 1 MB.</span></label><div className="mt-6 flex justify-between"><button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-mute"><ArrowLeft size={14}/> Back</button><button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white">Continue <ArrowRight size={14}/></button></div></div>}
      {step === 3 && <div className="rounded-2xl border border-hair bg-white p-5 sm:p-6"><h2 className="text-base font-semibold text-ink">Tell us what you have done.</h2><p className="mt-1 text-xs leading-5 text-mute">Write naturally. Dates, organisations and achievements should be factual; AI will turn them into professional resume language.</p><div className="mt-5 space-y-5"><TextArea label="Education" name="education" value={answers.education} onChange={onChange} placeholder="University, degree, field, dates, grade if you want it included..."/><TextArea label="Work / internship experience" name="experience" value={answers.experience} onChange={onChange} placeholder="Employer, role, dates, what you did and any measurable outcomes..."/><TextArea label="Projects" name="projects" value={answers.projects} onChange={onChange} rows={3}/><TextArea label="Skills" name="skills" value={answers.skills} onChange={onChange} required rows={3} placeholder="Excel, Python, presentations, customer service..."/><TextArea label="Achievements & leadership" name="achievements" value={answers.achievements} onChange={onChange} rows={3}/><div className="grid gap-4 sm:grid-cols-2"><TextArea label="Certifications" name="certifications" value={answers.certifications} onChange={onChange} rows={3}/><TextArea label="Languages" name="languages" value={answers.languages} onChange={onChange} rows={3}/></div><TextArea label="Anything else we should understand?" name="additionalContext" value={answers.additionalContext} onChange={onChange} rows={3} hint="Optional context about your goals, career change, gaps, international experience or the story you want the cover letter to reflect."/></div><div className="mt-6 flex justify-between"><button onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-mute"><ArrowLeft size={14}/> Back</button><button disabled={generating} onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{generating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} {generating ? "Building your resume..." : "Generate resume"}</button></div></div>}
      {step === 4 && generated && <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Preview ready</div><h2 className="mt-1 text-lg font-semibold text-ink">Your two-page SOUP resume</h2></div>{!manageOnly && <button onClick={() => setStep(3)} className="text-xs font-semibold text-navy">Edit answers</button>}</div><div className="flex justify-end"><button onClick={() => setEditing((v) => !v)} className="rounded-xl border border-hair bg-white px-4 py-2 text-xs font-semibold text-navy">{editing ? "Close editor" : "Edit resume fields"}</button></div>{editing && <ResumeEditor value={generated} onChange={setGenerated} />}<ResumePreview generated={generated} photo={photo}/><div className="rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2"><FileText size={15} className="text-navy"/><h3 className="text-sm font-semibold text-ink">Your cover letter</h3></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-mute">{generated.coverLetter}</p></div><div className="rounded-2xl border border-[#D9E7E3] bg-[#F4FAF8] p-5"><div className="flex items-center gap-2"><Sparkles size={15} className="text-teal"/><h3 className="text-sm font-semibold text-ink">A few ways this profile could become stronger</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{generated.previewTips.length ? generated.previewTips.map((tip, i) => <div key={i} className="rounded-xl bg-white p-3"><div className="text-xs font-semibold text-ink">{tip.title}</div><div className="mt-1 text-[11px] leading-5 text-mute">{tip.why}</div></div>) : <div className="text-xs text-mute">Your full improvement roadmap will live in My SOUP.</div>}</div><div className="mt-3 text-[11px] text-mute">You can continue refining this version with Noodles whenever your application goal changes.</div></div><div className="flex flex-wrap justify-end gap-2"><button onClick={() => { if (manageOnly) { router.push("/resume"); return; } setGenerated(null); setAnswers(EMPTY); setPhoto(undefined); setActiveId(undefined); setStep(1); }} className="rounded-xl border border-hair px-4 py-2.5 text-sm font-medium text-ink">{manageOnly ? "Build another resume" : "Start another"}</button><button disabled={saving} onClick={saveFinal} className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} {signedIn ? "Save to My SOUP" : "Create account & save"}</button>{signedIn && activeId && <><a href={`/api/export/resume?id=${activeId}&format=pdf`} className="rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white">Download Resume</a><a href={`/api/export/cover-letter?id=${activeId}`} className="rounded-xl border border-hair bg-white px-5 py-2.5 text-sm font-medium text-ink">Download Cover Letter</a></>}</div></div>}
    </section>
  </div>;
}
