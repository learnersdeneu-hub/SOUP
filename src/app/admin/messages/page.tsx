import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_ROLES } from "@/lib/auth/roles";
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

// Unified view across every application's email thread — the per-application
// "Email communication" section on /admin/applications/[id] is where a
// specific thread is read in full and replied to; this page exists because
// nothing previously let staff see new messages without already knowing
// which application to check.
export default async function AdminMessagesPage() {
  await requireRole(APPLICATION_ROLES);

  const messages = await prisma.applicationMessage.findMany({
    orderBy: { receivedAt: "desc" },
    take: 150,
    include: {
      application: { include: { profile: { include: { user: true } }, university: true } },
      sentBy: true,
    },
  });

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
    <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div>
    <h1 className="mt-1 text-2xl font-semibold text-ink">Application messages</h1>
    <p className="mt-2 text-sm leading-6 text-mute">Every email a student has sent to (or received from) SOUP through an application's own reply address, most recent first. Open an application to read the full thread and reply.</p>

    <div className="mt-6 space-y-3">
      {messages.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No application messages yet.</div> : messages.map((message) => {
        const inbound = message.direction === "INBOUND";
        const studentName = message.application.profile.user.fullName;
        const universityName = message.application.university?.name || "Application";
        return (
          <Link key={message.id} href={`/admin/applications/${message.applicationId}`} className="block rounded-2xl border border-hair bg-white p-4 transition hover:border-navy/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${inbound ? "bg-[#EAF5F3] text-teal" : "bg-[#EAF0F5] text-navy"}`}>
                  {inbound ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[.1em] text-mute">{inbound ? "From student" : `Sent by ${message.sentBy?.fullName || "SOUP"}`}</div>
                  <div className="mt-1 text-sm font-semibold text-ink">{message.subject || "(no subject)"}</div>
                  <div className="mt-1 text-xs text-mute">{studentName} · {universityName}</div>
                  {message.textBody && <p className="mt-2 max-w-2xl text-xs leading-5 text-mute line-clamp-2">{message.textBody.slice(0, 240)}</p>}
                </div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-mute">{message.receivedAt.toLocaleString()}</div>
            </div>
          </Link>
        );
      })}
    </div>
  </main></div>;
}
