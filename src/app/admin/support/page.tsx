import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { SUPPORT_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { addInternalSupportNote, assignSupportTicket, replyToSupportTicket, updateSupportTicketStatus } from "@/app/actions/support";
import type { SupportTicketStatus } from "@prisma/client";

export default async function AdminSupportPage({ searchParams }: { searchParams: { status?: string } }) {
  const current = await requireRole(SUPPORT_ROLES);
  const allowedStatuses = new Set<SupportTicketStatus>(["OPEN","IN_PROGRESS","WAITING_FOR_CUSTOMER","RESOLVED","CLOSED"]);
  const requestedStatus = searchParams.status && allowedStatuses.has(searchParams.status as SupportTicketStatus)
    ? searchParams.status as SupportTicketStatus
    : undefined;
  const visibility = ["ADMIN", "SUPER_ADMIN"].includes(current.user.role)
    ? {}
    : { OR: [{ assignedToUserId: current.user.id }, { assignedToUserId: null }] };
  const [tickets, staff] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { ...visibility, ...(requestedStatus ? { status: requestedStatus } : {}) },
      include: { customer: true, assignedTo: true, messages: { include: { author: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN","SUPER_ADMIN","SUPPORT"] }, accountStatus: "ACTIVE" }, orderBy: { fullName: "asc" } }),
  ]);

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold text-ink">Support queue</h1><p className="mt-2 text-sm text-mute">Assign, reply, leave internal notes and resolve real customer requests.</p></div><form><select name="status" defaultValue={requestedStatus||""} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm" onChange={undefined}><option value="">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_FOR_CUSTOMER">Waiting for customer</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><button className="ml-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Filter</button></form></div>
    <div className="mt-6 space-y-5">{tickets.length===0?<div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No support tickets in this view.</div>:tickets.map((ticket)=><article key={ticket.id} className="rounded-2xl border border-hair bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><div className="text-sm font-semibold text-ink">{ticket.subject}</div><div className="mt-1 text-xs text-mute">{ticket.customer.fullName} · {ticket.customer.email} · {ticket.category}</div><div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-mute">{ticket.status.replaceAll("_"," ")} · {ticket.priority}</div></div><form action={async(formData)=>{"use server"; const value=String(formData.get("assignee")||""); await assignSupportTicket(ticket.id,value||null);}} className="flex items-center gap-2"><select name="assignee" defaultValue={ticket.assignedToUserId||""} className="rounded-lg border border-hair px-3 py-2 text-xs"><option value="">Unassigned</option>{staff.map((u)=><option key={u.id} value={u.id}>{u.fullName}</option>)}</select><button className="rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-ink">Assign</button></form></div>
      <div className="mt-4 rounded-xl bg-[#FAFAFA] p-4">{ticket.messages.map((m)=><div key={m.id} className={`mb-3 last:mb-0 ${m.isInternal?"rounded-lg border border-amber-200 bg-amber-50 p-3":""}`}><div className="text-[11px] font-semibold text-ink">{m.author.fullName}{m.isInternal?" · Internal note":""}</div><div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-mute">{m.body}</div><div className="mt-1 text-[10px] text-mute">{m.createdAt.toLocaleString()}</div></div>)}</div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2"><form action={replyToSupportTicket.bind(null,ticket.id)} className="flex gap-2"><input name="body" required placeholder="Reply to customer" className="min-w-0 flex-1 rounded-lg border border-hair px-3 py-2 text-xs"/><button className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">Send reply</button></form><form action={addInternalSupportNote.bind(null,ticket.id)} className="flex gap-2"><input name="body" required placeholder="Internal note (customer cannot see this)" className="min-w-0 flex-1 rounded-lg border border-hair px-3 py-2 text-xs"/><button className="rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-ink">Add note</button></form></div>
      <div className="mt-3 flex flex-wrap gap-2">{(["OPEN","IN_PROGRESS","WAITING_FOR_CUSTOMER","RESOLVED","CLOSED"] as SupportTicketStatus[]).map((status)=><form key={status} action={updateSupportTicketStatus.bind(null,ticket.id,status)}><button className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${ticket.status===status?"border-navy bg-navy text-white":"border-hair text-mute"}`}>{status.replaceAll("_"," ")}</button></form>)}</div>
    </article>)}</div>
    <p className="mt-6 text-[11px] text-mute">Signed in as {current.user.fullName}. Internal notes are intentionally never returned on the customer support page.</p>
  </main></div>;
}
