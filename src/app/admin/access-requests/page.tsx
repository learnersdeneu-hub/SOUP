import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { approveAccessRequest, denyAccessRequest, resendAccessInvite } from "@/app/actions/accessRequests";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireRole()
// already forces dynamic rendering implicitly via cookies(), but that is an
// implicit guarantee a future refactor could silently break; this makes it
// explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function AccessRequestsPage() {
  await requireRole(ADMIN_ROLES);

  const [pending, decided] = await Promise.all([
    prisma.accessRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.accessRequest.findMany({ where: { status: { in: ["APPROVED", "DENIED"] } }, orderBy: { reviewedAt: "desc" }, take: 50, include: { reviewedBy: { select: { fullName: true } } } }),
  ]);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Access requests</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">Students can no longer create their own SOUP account. Approving a request here emails that person a sign-in link; denying leaves them without access.</p>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Pending ({pending.length})</h2>
          </div>
          <div className="mt-3 space-y-3">
            {pending.length === 0 && <div className="rounded-2xl border border-hair bg-white p-6 text-sm text-mute">No pending requests.</div>}
            {pending.map((request) => (
              <div key={request.id} className="rounded-2xl border border-hair bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{request.fullName}</div>
                    <div className="mt-0.5 text-xs text-mute">{request.email}</div>
                    <div className="mt-1 text-xs text-mute">{request.institutionName}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[.08em] text-mute">Requested {request.createdAt.toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={async () => { "use server"; await denyAccessRequest(request.id); }}>
                      <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Deny</button>
                    </form>
                    <form action={async () => { "use server"; await approveAccessRequest(request.id); }}>
                      <button className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white">Approve & send invite</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-ink">Recently decided</h2>
          <div className="mt-3 space-y-2">
            {decided.length === 0 && <div className="rounded-2xl border border-hair bg-white p-6 text-sm text-mute">No decisions yet.</div>}
            {decided.map((request) => (
              <div key={request.id} className="flex flex-col justify-between gap-2 rounded-2xl border border-hair bg-white p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{request.fullName} <span className="text-xs font-normal text-mute">· {request.email}</span></div>
                  <div className="mt-0.5 text-[11px] text-mute">{request.institutionName} · {request.reviewedBy?.fullName ? `by ${request.reviewedBy.fullName}` : "reviewed"} on {request.reviewedAt?.toLocaleString()}</div>
                  {request.reviewNote && <div className="mt-1 text-[11px] text-mute">Note: {request.reviewNote}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${request.status === "APPROVED" ? "bg-[#F0F7F5] text-teal" : "bg-[#FFF3F0] text-[#9D3127]"}`}>{request.status}</span>
                  {request.status === "APPROVED" && (
                    <form action={async () => { "use server"; await resendAccessInvite(request.id); }}>
                      <button className="rounded-lg border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink">Resend invite</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
