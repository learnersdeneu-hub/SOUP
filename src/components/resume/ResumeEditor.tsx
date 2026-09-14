"use client";

import type { GeneratedResume, ResumeContent } from "@/lib/resume/types";

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "w-full rounded-xl border border-hair bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy";
  return <label className="block"><span className="mb-1 block text-xs font-medium text-ink">{label}</span>{multiline ? <textarea rows={4} className={cls} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}

export function ResumeEditor({ value, onChange }: { value: GeneratedResume; onChange: (v: GeneratedResume) => void }) {
  const c = value.content;
  const setContent = (next: ResumeContent) => onChange({ ...value, content: next });
  const personal = (key: keyof ResumeContent["personal"], v: string) => setContent({ ...c, personal: { ...c.personal, [key]: v } });
  const list = (key: "skills"|"achievements"|"certifications"|"languages", v: string) => setContent({ ...c, [key]: v.split("\n").map(x => x.trim()).filter(Boolean) });

  return <div className="space-y-5 rounded-2xl border border-hair bg-[#FBFCFD] p-5">
    <div><div className="text-sm font-semibold text-ink">Edit your resume</div><p className="mt-1 text-xs leading-5 text-mute">Changes are saved as a new version only when you press Save. One item per line for list fields.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" value={c.personal.fullName} onChange={(v)=>personal("fullName",v)} />
      <Field label="Headline" value={c.personal.headline} onChange={(v)=>personal("headline",v)} />
      <Field label="Email" value={c.personal.email} onChange={(v)=>personal("email",v)} />
      <Field label="Phone" value={c.personal.phone || ""} onChange={(v)=>personal("phone",v)} />
      <Field label="Location" value={c.personal.location || ""} onChange={(v)=>personal("location",v)} />
      <Field label="LinkedIn" value={c.personal.linkedin || ""} onChange={(v)=>personal("linkedin",v)} />
      <Field label="Portfolio" value={c.personal.portfolio || ""} onChange={(v)=>personal("portfolio",v)} />
      <Field label="Target role" value={c.targetRole} onChange={(v)=>setContent({...c,targetRole:v})} />
    </div>
    <Field label="Professional summary" value={c.personal.summary} multiline onChange={(v)=>personal("summary",v)} />
    <div className="space-y-3"><div className="text-xs font-semibold uppercase tracking-[.14em] text-mute">Experience</div>{c.experience.map((x,i)=><div key={i} className="grid gap-3 rounded-xl border border-hair bg-white p-3 sm:grid-cols-2"><Field label="Employer" value={x.employer} onChange={(v)=>{const a=[...c.experience];a[i]={...x,employer:v};setContent({...c,experience:a})}}/><Field label="Role" value={x.title} onChange={(v)=>{const a=[...c.experience];a[i]={...x,title:v};setContent({...c,experience:a})}}/><div className="sm:col-span-2"><Field label="Achievement bullets (one per line)" multiline value={x.bullets.join("\n")} onChange={(v)=>{const a=[...c.experience];a[i]={...x,bullets:v.split("\n").filter(Boolean)};setContent({...c,experience:a})}}/></div></div>)}</div>
    <div className="space-y-3"><div className="text-xs font-semibold uppercase tracking-[.14em] text-mute">Education</div>{c.education.map((x,i)=><div key={i} className="grid gap-3 rounded-xl border border-hair bg-white p-3 sm:grid-cols-2"><Field label="Institution" value={x.institution} onChange={(v)=>{const a=[...c.education];a[i]={...x,institution:v};setContent({...c,education:a})}}/><Field label="Qualification" value={x.qualification} onChange={(v)=>{const a=[...c.education];a[i]={...x,qualification:v};setContent({...c,education:a})}}/><Field label="Field" value={x.field || ""} onChange={(v)=>{const a=[...c.education];a[i]={...x,field:v};setContent({...c,education:a})}}/><Field label="Location" value={x.location || ""} onChange={(v)=>{const a=[...c.education];a[i]={...x,location:v};setContent({...c,education:a})}}/></div>)}</div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Skills" multiline value={c.skills.join("\n")} onChange={(v)=>list("skills",v)}/><Field label="Achievements" multiline value={c.achievements.join("\n")} onChange={(v)=>list("achievements",v)}/><Field label="Certifications" multiline value={c.certifications.join("\n")} onChange={(v)=>list("certifications",v)}/><Field label="Languages" multiline value={c.languages.join("\n")} onChange={(v)=>list("languages",v)}/></div>
    <Field label="Cover letter" multiline value={value.coverLetter} onChange={(v)=>onChange({...value,coverLetter:v})}/>
  </div>;
}
