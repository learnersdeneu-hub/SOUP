import Link from "next/link";
import { ArrowLeft, Download, FileText, Landmark } from "lucide-react";
import type { PaymentStatus } from "@prisma/client";
import { Header } from "@/components/Header";
import { confirmBankPayment, rejectBankPayment } from "@/app/actions/bankPayments";
import { requireRole } from "@/lib/auth/currentUser";
import { PAYMENT_REVIEW_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { BANK_TRANSFER_PROVIDER, bankMetadata, bankTransferReady, formatPkr, formatUsd } from "@/lib/payments/bankTransfer";

// See src/app/actions/auth.ts (invalidateAuthenticatedPages) for why staff
// pages force dynamic rendering explicitly.
export const dynamic = "force-dynamic";

const TABS: Array<[string, string, PaymentStatus[]]> = [
  ["review", "To verify", ["REQUIRES_ACTION"]],
  ["awaiting", "Awaiting transfer", ["PENDING"]],
  ["paid", "Confirmed", ["PAID"]],
];

function fmt(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireRole(PAYMENT_REVIEW_ROLES);
  const tab = TABS.find(([key]) => key === searchParams.tab) || TABS[0];
  const [payments, counts] = await Promise.all([
    prisma.payment.findMany({
      where: { provider: BANK_TRANSFER_PROVIDER, status: { in: tab[2] } },
      include: { profile: { include: { user: { select: { fullName: true, email: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.payment.groupBy({ by: ["status"], where: { provider: BANK_TRANSFER_PROVIDER }, _count: true }),
  ]);
  const countFor = (statuses: PaymentStatus[]) => counts.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + row._count, 0);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-mute"><ArrowLeft size={13} /> Admin</Link>
        <div className="mt-3 flex items-center gap-2"><Landmark size={20} className="text-teal" /><h1 className="text-2xl font-semibold text-ink">Bank transfer payments</h1></div>
        <p className="mt-2 max-w-2xl text-sm text-mute">Check each student&apos;s reference or receipt against the MCB Islamic account statement. Confirming marks the SOUP Scholar payment as paid and unlocks uploads and submissions on that account immediately.</p>
        {!bankTransferReady() && <div className="mt-4 rounded-xl border border-[#E8C9A8] bg-[#FFF8F1] p-4 text-xs text-[#8A4B12]">Bank account details aren&apos;t configured yet (src/lib/payments/bankTransfer.ts), so students can&apos;t request invoices.</div>}

        <nav className="mt-6 flex gap-2">
          {TABS.map(([key, label, statuses]) => (
            <Link key={key} href={`/admin/payments?tab=${key}`} className={`rounded-full px-4 py-2 text-xs font-semibold ${tab[0] === key ? "bg-navy text-white" : "border border-hair bg-white text-ink"}`}>{label} · {countFor(statuses)}</Link>
          ))}
        </nav>

        <section className="mt-5 divide-y divide-hair rounded-2xl border border-hair bg-white">
          {payments.length === 0 && <div className="p-8 text-center text-sm text-mute">Nothing here right now.</div>}
          {payments.map((payment) => {
            const meta = bankMetadata(payment.metadata);
            return (
              <div key={payment.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-start">
                <div>
                  <div className="text-sm font-semibold text-ink">{payment.profile.user.fullName || payment.profile.user.email}</div>
                  <div className="text-xs text-mute">{payment.profile.user.email}</div>
                  <div className="mt-2 text-xs text-ink"><b>{meta.invoiceNumber}</b> · {formatUsd(String(payment.amount))}{meta.pkrAmount ? ` = ${formatPkr(meta.pkrAmount)} (1 USD = ${meta.usdToPkrRate} PKR)` : " · PKR at bank rate"}</div>
                  <div className="mt-1 text-[11px] text-mute">Issued {fmt(payment.createdAt)}{meta.submittedAt ? ` · submitted ${fmt(meta.submittedAt)}` : ""}{payment.paidAt ? ` · confirmed ${fmt(payment.paidAt)} by ${meta.reviewedBy}` : ""}</div>
                </div>
                <div className="text-xs">
                  <div className="text-mute">Transaction reference</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-ink">{meta.transactionReference || "-"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meta.proofStorageRef && <a href={`/api/payments/proof/${payment.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-1.5 font-semibold text-navy"><FileText size={12} /> Receipt</a>}
                    <a href={`/api/payments/invoice/${payment.id}`} className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-1.5 font-semibold text-navy"><Download size={12} /> Invoice</a>
                  </div>
                  {meta.reviewNote && payment.status === "PENDING" && <div className="mt-2 text-[11px] text-[#9B3A32]">Last returned: {meta.reviewNote}</div>}
                </div>
                {payment.status !== "PAID" && (
                  <div className="flex flex-col gap-2 lg:w-64">
                    <form action={confirmBankPayment.bind(null, payment.id)}>
                      <button className="w-full rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white">Confirm payment received</button>
                    </form>
                    {payment.status === "REQUIRES_ACTION" && (
                      <form action={rejectBankPayment.bind(null, payment.id)} className="flex gap-2">
                        <input name="note" placeholder="Reason (shown to student)" className="min-w-0 flex-1 rounded-xl border border-hair px-3 py-2 text-xs" />
                        <button className="rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-[#9B3A32]">Return</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
