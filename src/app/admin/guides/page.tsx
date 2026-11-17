import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { isPublished, loadAllGuides } from "@/lib/guides/content";

// See src/app/admin/messages/page.tsx for why staff pages force dynamic rendering.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Editorial overview of content/guides: every article with its workflow
// status, so drafts can be read in the real page template before an editor
// sets `status: "published"` in the Markdown file.
export default async function AdminGuidesPage() {
  await requireRole(STAFF_ROLES);
  const guides = loadAllGuides();
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Guides (editorial preview)</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">Articles live as Markdown in <code>content/guides</code>. A guide goes live at its public URL only when its front matter has <code>status: &quot;published&quot;</code> and a <code>publication_date</code> that has arrived. Until then it 404s publicly and can only be previewed here.</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-hair bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-hair bg-paper/60 text-[10px] font-semibold uppercase tracking-[.1em] text-mute"><th className="px-4 py-3">Article</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Publication</th><th className="px-4 py-3">Review notes</th></tr></thead>
            <tbody>
              {guides.map((guide) => {
                const live = isPublished(guide);
                return (
                  <tr key={guide.file} className="border-b border-hair last:border-0 align-top">
                    <td className="px-4 py-3"><Link href={`/admin/guides/${guide.slug}`} className="font-semibold text-ink hover:text-teal">{guide.h1}</Link><div className="mt-1 text-[11px] text-mute">{guide.path}</div></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${live ? "bg-teal/10 text-teal" : "bg-paper text-mute"}`}>{live ? "Live" : guide.status}</span></td>
                    <td className="px-4 py-3 text-xs text-mute">{guide.publicationDate || "Not scheduled"}</td>
                    <td className="px-4 py-3 text-xs text-mute">{guide.reviewNotes.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
