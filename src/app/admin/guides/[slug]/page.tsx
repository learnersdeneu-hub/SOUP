import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { GuideArticle } from "@/components/guides/GuideArticle";
import { requireRole } from "@/lib/auth/currentUser";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { isPublished, loadAllGuides } from "@/lib/guides/content";

// See src/app/admin/messages/page.tsx for why staff pages force dynamic rendering.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminGuidePreviewPage({ params }: { params: { slug: string } }) {
  await requireRole(STAFF_ROLES);
  const guide = loadAllGuides().find((item) => item.slug === params.slug);
  if (!guide) notFound();
  const live = isPublished(guide);
  const banner = (
    <div className="mb-6 rounded-2xl border border-hair bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-teal">{live ? "Live" : "Preview, not public"}</p>
      <p className="mt-1 text-sm text-ink">Status: <strong>{guide.status}</strong> · Publication date: <strong>{guide.publicationDate || "not scheduled"}</strong> · Source: <code>content/guides/{guide.file}</code></p>
      {guide.reviewNotes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-mute">
          {guide.reviewNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
    </div>
  );
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main><GuideArticle guide={guide} banner={banner} /></main>
    </div>
  );
}
