import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { createSupportTicket, replyToSupportTicket, requestHumanCounselor } from "@/app/actions/support";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { SOUP_SUPPORT_EMAIL, supportWhatsAppUrl } from "@/lib/support/config";

export default async function SupportPage() {
  const { profile } = await requireProfile();
  const tickets = await prisma.supportTicket.findMany({
    where: { profileId: profile.id },
    include: { messages: { where: { isInternal: false }, include: { author: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <section className="rounded-[28px] bg-navy px-6 py-7 text-white sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Help centre</div>
          <h1 className="mt-2 text-2xl font-semibold">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Your request stays attached to your SOUP case. New support requests alert the internal support queue immediately and also send an email notification to the admissions team when email delivery is configured.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <form action={requestHumanCounselor}><input type="hidden" name="reason" value="Student requested direct human counselor support from the Help Centre."/><button className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white">Request a human counselor</button></form>
            <a href={supportWhatsAppUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-navy"><MessageCircle size={14}/> WhatsApp +48 739 654 618</a>
            <a href={`mailto:${SOUP_SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold text-white"><Mail size={14}/> {SOUP_SUPPORT_EMAIL}</a>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <form action={createSupportTicket} className="h-fit space-y-3 rounded-2xl border border-hair bg-white p-5">
            <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-teal"/><h2 className="text-sm font-semibold text-ink">Message the SOUP team</h2></div>
            <p className="text-xs leading-5 text-mute">Use this for anything tied to your account or case so the team can see the request in context.</p>
            <input name="subject" required placeholder="What do you need help with?" className="w-full rounded-xl border border-hair px-3 py-2.5 text-sm outline-none focus:border-navy/40" />
            <select name="category" className="w-full rounded-xl border border-hair px-3 py-2.5 text-sm outline-none focus:border-navy/40">
              <option value="ADMISSIONS">Admissions / university matching</option>
              <option value="APPLICATION">Application</option>
              <option value="DOCUMENT">Documents</option>
              <option value="PAYMENT">Payments</option>
              <option value="VISA">Visa / post-offer</option>
              <option value="COUNSELOR_HANDOFF">Human counselor / escalation</option>
              <option value="REFUND_DISPUTE">Refund / payment dispute</option>
              <option value="COMPLAINT">Complaint / urgent case review</option>
              <option value="ACCOMMODATION">Accommodation</option>
              <option value="ACCOUNT">Account / login</option>
              <option value="GENERAL">Something else</option>
            </select>
            <textarea name="body" required rows={6} placeholder="Tell us what you need, the university or application if relevant, and any deadline." className="w-full resize-none rounded-xl border border-hair px-3 py-2.5 text-sm outline-none focus:border-navy/40" />
            <button className="w-full rounded-xl bg-navy py-2.5 text-sm font-medium text-white">Send to SOUP support</button>
            <div className="rounded-xl bg-[#F4FAF8] px-3 py-2 text-[11px] leading-5 text-teal">A copy of this request is saved to your account so you can follow every reply here.</div>
          </form>

          <section className="space-y-4">
            {tickets.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-8"><div className="text-sm font-semibold text-ink">No support requests yet</div><p className="mt-2 text-xs leading-5 text-mute">If something feels unclear in your journey, application, documents or payments, send us a message. You do not need to work out which department should receive it.</p></div> : tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-2xl border border-hair bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-sm font-semibold text-ink">{ticket.subject}</div><div className="mt-1 text-xs text-mute">{ticket.category.replaceAll("_", " ")} · updated {ticket.updatedAt.toLocaleDateString()}</div></div>
                  <span className="rounded-full bg-[#F1F1F1] px-2.5 py-1 text-[11px] font-medium text-mute">{ticket.status.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-4 space-y-3 rounded-xl bg-[#FAFAFA] p-4">
                  {ticket.messages.map((message) => <div key={message.id}><div className="text-[11px] font-semibold text-ink">{message.author.fullName}</div><div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-mute">{message.body}</div><div className="mt-1 text-[10px] text-mute">{message.createdAt.toLocaleString()}</div></div>)}
                </div>
                {ticket.status !== "CLOSED" ? <form action={replyToSupportTicket.bind(null,ticket.id)} className="mt-3 flex gap-2"><input name="body" required placeholder="Reply to SOUP" className="min-w-0 flex-1 rounded-lg border border-hair px-3 py-2 text-xs"/><button className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">Reply</button></form> : <p className="mt-3 text-xs text-mute">This request is closed. Open a new request if you need more help.</p>}
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
