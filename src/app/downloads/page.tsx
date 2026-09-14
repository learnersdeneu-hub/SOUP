import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { listResumes } from "@/lib/queries/resumes";

export default async function DownloadsPage() {
  const { profile } = await requireProfile();
  const resumes = await listResumes(profile.id);
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">My SOUP</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Downloads</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Your saved SOUP application files. Resume and cover-letter exports are generated from the same saved version.</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white">
          {resumes.length === 0 ? (
            <div className="px-6 py-12 text-center"><FileText className="mx-auto text-mute"/><div className="mt-3 text-sm font-semibold text-ink">No resume downloads yet</div><p className="mt-1 text-xs text-mute">Build and save a resume first.</p><Link href="/resume" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white">Build resume</Link></div>
          ) : resumes.map((resume) => (
            <div key={resume.id} className="flex flex-col gap-4 border-b border-hair p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="text-sm font-semibold text-ink">{resume.title}</div><div className="mt-1 text-xs text-mute">Updated {resume.updatedAt.toLocaleDateString()} · {resume.versions?.[0]?.version ? `v${resume.versions[0].version}` : "saved"}</div></div>
              <div className="flex flex-wrap gap-2"><a href={`/api/export/resume?id=${resume.id}&format=pdf`} className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2 text-xs font-semibold text-white"><Download size={13}/>Resume PDF</a><a href={`/api/export/resume?id=${resume.id}&format=docx`} className="inline-flex items-center gap-1.5 rounded-xl border border-teal px-3.5 py-2 text-xs font-semibold text-teal"><Download size={13}/>Resume Word</a><a href={`/api/export/cover-letter?id=${resume.id}&format=pdf`} className="inline-flex items-center gap-1.5 rounded-xl border border-hair px-3.5 py-2 text-xs font-semibold text-ink"><Download size={13}/>Cover PDF</a><a href={`/api/export/cover-letter?id=${resume.id}&format=docx`} className="inline-flex items-center gap-1.5 rounded-xl border border-hair px-3.5 py-2 text-xs font-semibold text-ink"><Download size={13}/>Cover Word</a></div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
