import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, FileText, ShieldCheck, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DocumentReviewStatus } from "@prisma/client";
import { Header } from "@/components/Header";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { DirectDocumentUpload } from "@/components/documents/DirectDocumentUpload";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  UPLOADED: "bg-slate-100 text-slate-700",
  PENDING_REVIEW: "bg-amber-50 text-amber-800",
  MORE_INFO_REQUIRED: "bg-orange-50 text-orange-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

function validityLabel(validUntil: Date | null, issuedAt: Date | null) {
  if (validUntil) {
    const today = new Date();
    const days = Math.ceil((validUntil.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return { text: `Expired ${validUntil.toLocaleDateString()}`, warn: true };
    if (days <= 90) return { text: `Expires ${validUntil.toLocaleDateString()} · ${days} day${days === 1 ? "" : "s"} left`, warn: true };
    return { text: `Valid until ${validUntil.toLocaleDateString()}`, warn: false };
  }
  if (issuedAt) return { text: `Issued ${issuedAt.toLocaleDateString()}`, warn: false };
  return { text: "No validity date extracted", warn: false };
}

export default async function DocumentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const { profile } = await requireProfile();
  const allowedStatuses = new Set<DocumentReviewStatus>(["UPLOADED", "PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "REJECTED", "EXPIRED"]);
  const requestedStatus = searchParams.status && allowedStatuses.has(searchParams.status as DocumentReviewStatus)
    ? searchParams.status as DocumentReviewStatus
    : undefined;

  const documents = await prisma.document.findMany({
    where: { profileId: profile.id, ...(requestedStatus ? { reviewStatus: requestedStatus } : {}) },
    include: { credential: { include: { credentialType: true } }, reviewEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { uploadedAt: "desc" },
  });
  const counts = await prisma.document.groupBy({ by: ["reviewStatus"], where: { profileId: profile.id }, _count: true });
  const count = Object.fromEntries(counts.map((row) => [row.reviewStatus, row._count]));
  const expiryWarnings = documents.filter((doc) => doc.validUntil && doc.validUntil.getTime() <= Date.now() + 90 * 86_400_000).length;

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">My SOUP</div>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Documents</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Documents requested during your student journey stay in one reusable vault. SOUP can read dates from documents to flag upcoming expiry, but authority acceptance and freshness rules remain separate.</p>
          </div>
          <Link href="/counselor" className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"><Upload size={15}/>Continue with Counselor</Link>
        </div>

        <div className="mt-6 max-w-md">
          <DirectDocumentUpload/>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {([
            ["All", documents.length, FileText],
            ["Pending", count.PENDING_REVIEW || 0, Clock3],
            ["Needs attention", (count.MORE_INFO_REQUIRED || 0) + (count.REJECTED || 0) + expiryWarnings, AlertTriangle],
            ["Approved", count.APPROVED || 0, ShieldCheck],
          ] satisfies Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-hair bg-white p-4">
              <Icon size={15} className="text-navy"/>
              <div className="mt-3 text-2xl font-semibold text-ink">{value}</div>
              <div className="text-xs text-mute">{label}</div>
            </div>
          ))}
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          {[["All", ""], ["Pending", "PENDING_REVIEW"], ["More info", "MORE_INFO_REQUIRED"], ["Approved", "APPROVED"], ["Rejected", "REJECTED"]].map(([label, status]) => (
            <Link key={label} href={status ? `/documents?status=${status}` : "/documents"} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${requestedStatus === status || (!requestedStatus && !status) ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink"}`}>{label}</Link>
          ))}
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-hair bg-white">
          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto text-mute"/>
              <div className="mt-3 text-sm font-semibold text-ink">No documents in this view</div>
              <p className="mt-1 text-xs text-mute">Documents the Counselor asks you to upload will appear here.</p>
            </div>
          ) : documents.map((doc) => {
            const validity = validityLabel(doc.validUntil, doc.documentIssuedAt);
            return (
              <div key={doc.id} className="grid gap-4 border-b border-hair p-5 last:border-0 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                <div>
                  <div className="text-sm font-semibold text-ink">{doc.originalFileName || doc.documentType}</div>
                  <div className="mt-1 text-xs text-mute">{doc.credential?.credentialType.label || doc.documentType} · uploaded {doc.uploadedAt.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[doc.reviewStatus] || STATUS_STYLE.UPLOADED}`}>{doc.reviewStatus.replaceAll("_", " ")}</span>
                  {doc.reviewReason ? <p className="mt-2 text-xs leading-5 text-mute">{doc.reviewReason}</p> : null}
                </div>
                <div className={`text-xs ${validity.warn ? "font-semibold text-amber-800" : "text-mute"}`}>{validity.text}</div>
                <OpenDocumentButton documentId={doc.id}/>
              </div>
            );
          })}
        </section>
        <Link href="/dashboard" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-navy">Back to dashboard <ArrowRight size={13}/></Link>
      </main>
    </div>
  );
}
