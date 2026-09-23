import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { DOCUMENT_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { updateDocumentReview } from "@/app/actions/adminDocuments";
import type { DocumentReviewStatus } from "@prisma/client";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const current = await requireRole(DOCUMENT_ROLES);
  const q = searchParams.q?.trim();
  const allowedStatuses = new Set<DocumentReviewStatus>(["UPLOADED","PENDING_REVIEW","MORE_INFO_REQUIRED","APPROVED","REJECTED","EXPIRED"]);
  const requestedStatus = searchParams.status && allowedStatuses.has(searchParams.status as DocumentReviewStatus)
    ? searchParams.status as DocumentReviewStatus
    : undefined;
  const supportScope = current.user.role === "SUPPORT"
    ? { profile: { supportTickets: { some: { assignedToUserId: current.user.id } } } }
    : {};
  const documents = await prisma.document.findMany({
    where: {
      ...supportScope,
      ...(requestedStatus ? { reviewStatus: requestedStatus } : {}),
      ...(q ? { OR: [
        { documentType: { contains: q, mode: "insensitive" } },
        { originalFileName: { contains: q, mode: "insensitive" } },
        { profile: { user: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } },
      ] } : {}),
    },
    include: {
      profile: { include: { user: true } },
      credential: { include: { credentialType: true } },
      reviewEvents: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { uploadedAt: "desc" },
    take: 200,
  });

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Document review</h1><p className="mt-2 text-sm text-mute">Review real customer evidence with explicit outcomes and a permanent review history.</p></div><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Customer, email or document" className="w-64 rounded-xl border border-hair bg-white px-3 py-2.5 text-sm outline-none"/><select name="status" defaultValue={requestedStatus||""} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="PENDING_REVIEW">Pending</option><option value="MORE_INFO_REQUIRED">More info</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Filter</button></form></div>
    <div className="mt-6 space-y-4">{documents.length===0?<div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No documents match this view.</div>:documents.map((doc)=><article key={doc.id} className="rounded-2xl border border-hair bg-white p-5"><div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_.8fr_auto] lg:items-start"><div><div className="text-sm font-semibold text-ink">{doc.originalFileName||doc.documentType}</div><div className="mt-1 text-xs text-mute">{doc.profile.user.fullName} · {doc.profile.user.email}</div><div className="mt-1 text-xs text-mute">{doc.credential?.credentialType.label||doc.documentType} · uploaded {doc.uploadedAt.toLocaleString()}</div></div><div><div className="text-xs font-semibold text-ink">Current status</div><div className="mt-1 text-xs text-mute">{doc.reviewStatus.replaceAll("_"," ")}</div>{doc.reviewReason?<div className="mt-2 rounded-lg bg-[#FAFAFA] p-2 text-xs text-mute">{doc.reviewReason}</div>:null}</div><div><div className="text-xs font-semibold text-ink">Recent review history</div>{doc.reviewEvents.length===0?<div className="mt-1 text-xs text-mute">No review actions yet.</div>:doc.reviewEvents.map((e)=><div key={e.id} className="mt-1 text-[11px] text-mute">{e.action.replaceAll("_"," ")} · {e.actor.fullName}</div>)}</div><OpenDocumentButton documentId={doc.id} admin/></div>
      <div className="mt-4 grid gap-2 border-t border-hair pt-4 md:grid-cols-3"><form action={async(formData)=>{"use server"; await updateDocumentReview(doc.id,"MORE_INFO_REQUIRED",String(formData.get("reason")||""));}} className="flex gap-2"><input name="reason" required placeholder="What is missing?" className="min-w-0 flex-1 rounded-lg border border-hair px-3 py-2 text-xs"/><button className="rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-ink">Request info</button></form><form action={async(formData)=>{"use server"; await updateDocumentReview(doc.id,"REJECTED",String(formData.get("reason")||""));}} className="flex gap-2"><input name="reason" required placeholder="Rejection reason" className="min-w-0 flex-1 rounded-lg border border-hair px-3 py-2 text-xs"/><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Reject</button></form>{["ADMIN", "SUPER_ADMIN"].includes(current.user.role) ? <form action={updateDocumentReview.bind(null,doc.id,"APPROVED",undefined)}><button className="w-full rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">Approve document</button></form> : <div className="rounded-lg border border-hair bg-[#FAFAFA] px-3 py-2 text-center text-xs text-mute">Admin approval required</div>}</div>
    </article>)}</div>
  </main></div>;
}
