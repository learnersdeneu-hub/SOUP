import Link from "next/link";
import { ArrowLeft, Bot, MessageSquareText, UserRound } from "lucide-react";
import { Header } from "@/components/Header";
import { appendStaffCounselorReply, setCounselorHandoff } from "@/app/actions/handoff";
import { requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export default async function AdminConversationPage({ params }: { params: { profileId: string; sessionId: string } }) {
  const current = await requireRole(CASE_ROLES);
  if (current.user.role === "SUPPORT") {
    const assigned = await prisma.supportTicket.findFirst({ where: { profileId: params.profileId, assignedToUserId: current.user.id }, select: { id: true } });
    if (!assigned) throw new Error("This student is not assigned to your support queue.");
  }

  const [profile, session] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { id: params.profileId }, include: { user: true, studentCase: true } }),
    prisma.chatSession.findFirst({ where: { id: params.sessionId, profileId: params.profileId, workflow: "COUNSELOR" }, include: { messages: { orderBy: { createdAt: "asc" } } } }),
  ]);
  if (!session) throw new Error("Counselor conversation not found.");

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href={`/admin/users/${profile.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Back to student case</Link>
        <section className="mt-4 rounded-2xl border border-hair bg-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Counselor history</div>
              <h1 className="mt-1 text-xl font-semibold text-ink">{session.title || "Noodles"}</h1>
              <div className="mt-1 text-xs text-mute">{profile.user.fullName} · {profile.user.email}</div>
            </div>
            <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${session.humanHandoffActive ? "bg-[#F0F7F5] text-teal" : "bg-paper text-mute"}`}>{session.humanHandoffActive ? "Human handoff active" : "AI Counselor active"}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-hair pt-4">
            {session.humanHandoffActive ? (
              <form action={setCounselorHandoff.bind(null, profile.id, session.id, false)}><button className="rounded-full border border-hair px-3 py-2 text-xs font-semibold text-ink">Return conversation to AI</button></form>
            ) : (
              <form action={setCounselorHandoff.bind(null, profile.id, session.id, true)} className="flex flex-wrap gap-2"><input name="reason" placeholder="Reason for handoff (optional)" className="rounded-full border border-hair px-3 py-2 text-xs outline-none"/><button className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">Take over Counselor</button></form>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="space-y-5">
            {session.messages.map((message) => {
              const metadata = message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata) ? message.metadata as Record<string, unknown> : {};
              const staff = metadata.source === "HUMAN_STAFF";
              const systemEvent = metadata.source === "SYSTEM_EVENT";
              return (
                <div key={message.id} className={`flex gap-3 ${message.role === "USER" ? "justify-end" : "justify-start"}`}>
                  {message.role === "ASSISTANT" && <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${staff ? "bg-teal text-white" : "bg-navy text-white"}`}>{staff ? <UserRound size={13}/> : <Bot size={13}/>}</div>}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "USER" ? "bg-[#EEF1F4] text-ink" : "bg-paper text-ink"}`}>
                    {staff && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-teal">SOUP team · {String(metadata.staffName || "Staff")}</div>}
                    {systemEvent && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-mute">SOUP system event</div>}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="mt-2 text-[10px] text-mute">{message.createdAt.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
            {!session.messages.length && <div className="py-8 text-center text-sm text-mute">No messages in this conversation yet.</div>}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="flex items-center gap-2"><MessageSquareText size={15} className="text-navy"/><h2 className="text-sm font-semibold text-ink">Reply as SOUP team</h2></div>
          <p className="mt-2 text-xs leading-5 text-mute">Sending a staff reply activates handoff for this conversation only, so the AI does not answer over your team here. Other Counselor threads stay AI-enabled. Release the handoff above when AI should resume in this thread.</p>
          <form action={appendStaffCounselorReply.bind(null, profile.id, session.id)} className="mt-4">
            <textarea name="message" required rows={4} placeholder="Write the student a reply..." className="w-full rounded-2xl border border-hair px-4 py-3 text-sm leading-6 outline-none"/>
            <button className="mt-3 rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white">Send staff reply</button>
          </form>
        </section>
      </main>
    </div>
  );
}
