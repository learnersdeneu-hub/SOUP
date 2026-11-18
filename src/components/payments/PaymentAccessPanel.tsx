import type { AppRole, Payment } from "@prisma/client";
import { CheckCircle2, Download, FileUp, Landmark, Lock, ShieldCheck } from "lucide-react";
import { requestScholarInvoice, submitPaymentProof } from "@/app/actions/bankPayments";
import { isGateExempt } from "@/lib/payments/access";
import {
  BANK_DETAILS, PARTNERSHIP_LINE, SCHOLAR_INVOICE, bankMetadata, bankTransferReady, formatPkr,
} from "@/lib/payments/bankTransfer";

const UNLOCKS = ["Uploading documents", "Approving applications for submission", "Accommodation & insurance requests", "SOUP Companion"];

function fmt(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

// The heart of /payments: shows whether the account is unlocked and, if not,
// walks the student through invoice → bank transfer → submit proof.
export function PaymentAccessPanel({ role, paid, openInvoice }: { role: AppRole; paid: boolean; openInvoice: Payment | null }) {
  if (isGateExempt(role)) {
    return (
      <section className="mt-6 flex items-center gap-3 rounded-2xl border border-hair bg-white p-5">
        <ShieldCheck size={20} className="shrink-0 text-teal" />
        <div className="text-sm text-ink"><b>Staff account.</b> <span className="text-mute">Uploads and submissions don&apos;t need a payment on staff and admin accounts.</span></div>
      </section>
    );
  }
  if (paid) {
    return (
      <section className="mt-6 rounded-2xl border border-[#D9E7E3] bg-[#F4FAF8] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal"><CheckCircle2 size={18} /> Your account is unlocked</div>
        <p className="mt-1.5 text-xs leading-5 text-mute">Your SOUP Scholar payment is confirmed. You can upload documents, submit applications and use every SOUP service.</p>
      </section>
    );
  }

  const meta = openInvoice ? bankMetadata(openInvoice.metadata) : {};
  const underReview = openInvoice?.status === "REQUIRES_ACTION";
  const ready = bankTransferReady();

  return (
    <section id="invoice" className="mt-6 overflow-hidden rounded-2xl border border-[#E8C9A8] bg-white">
      <div className="flex flex-col gap-4 border-b border-hair bg-[#FFF8F1] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Lock size={16} className="text-[#B23C0B]" /> Unlock uploads and submissions: one-time $20</div>
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-mute">You can keep exploring and filling in your profile for free. The {SCHOLAR_INVOICE.title} payment unlocks:</p>
          <ul className="mt-2 grid gap-1 text-xs text-ink sm:grid-cols-2">
            {UNLOCKS.map((item) => <li key={item} className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-teal" />{item}</li>)}
          </ul>
        </div>
        {!openInvoice && (ready ? (
          <form action={requestScholarInvoice} className="shrink-0">
            <button className="rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Get my invoice</button>
          </form>
        ) : (
          <div className="shrink-0 rounded-xl border border-hair bg-white px-4 py-2.5 text-xs text-mute">Bank transfer invoicing opens soon</div>
        ))}
      </div>

      {openInvoice && (
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-mute">Invoice</div>
                <div className="text-sm font-semibold text-ink">{meta.invoiceNumber}</div>
              </div>
              <a href={`/api/payments/invoice/${openInvoice.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-navy"><Download size={13} /> Download invoice (PDF)</a>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-mute">Amount</dt><dd className="mt-0.5 text-base font-semibold text-ink">{formatPkr(String(openInvoice.amount))}</dd></div>
              <div><dt className="text-mute">Due</dt><dd className="mt-0.5 font-semibold text-ink">{fmt(openInvoice.dueAt || meta.dueAt)}</dd></div>
              <div className="col-span-2"><dt className="text-mute">Status</dt><dd className={`mt-0.5 font-semibold ${underReview ? "text-navy" : "text-[#B23C0B]"}`}>{underReview ? `Submitted ${fmt(meta.submittedAt)}. SOUP is verifying your transfer (usually 1–2 working days).` : "Awaiting your bank transfer"}</dd></div>
            </dl>
            {meta.reviewNote && !underReview && (
              <div className="mt-4 rounded-xl border border-[#F1D7D4] bg-[#FFF7F6] p-3 text-xs text-[#9B3A32]"><b>We couldn&apos;t confirm your last submission:</b> {meta.reviewNote}</div>
            )}
            <div className="mt-5 rounded-xl border border-hair bg-paper/60 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink"><Landmark size={14} className="text-teal" /> Bank details · {PARTNERSHIP_LINE}</div>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
                {([
                  ["Bank", BANK_DETAILS.bankName], ["Account title", BANK_DETAILS.accountTitle], ["Account number", BANK_DETAILS.accountNumber],
                  ["IBAN", BANK_DETAILS.iban], ["Branch", [BANK_DETAILS.branchName, BANK_DETAILS.branchCode && `(code ${BANK_DETAILS.branchCode})`].filter(Boolean).join(" ")], ["SWIFT", BANK_DETAILS.swiftCode],
                ] as Array<[string, string]>).filter(([, v]) => v.trim()).map(([k, v]) => <div key={k} className="contents"><dt className="text-mute">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>)}
                <dt className="text-mute">Reference</dt><dd className="font-semibold text-ink">{meta.invoiceNumber}</dd>
              </dl>
            </div>
          </div>

          <form action={submitPaymentProof} className="rounded-xl border border-hair p-4">
            <input type="hidden" name="paymentId" value={openInvoice.id} />
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><FileUp size={15} /> {underReview ? "Update what you sent" : "Paid? Tell us here"}</div>
            <p className="mt-1 text-xs leading-5 text-mute">Enter the transaction reference from your bank, attach the paid invoice or receipt, or both.</p>
            <label className="mt-4 block text-xs font-semibold text-ink">Transaction reference
              <input name="transactionReference" defaultValue={meta.transactionReference || ""} maxLength={120} placeholder="e.g. FT26322ABC123" className="mt-1.5 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-sm font-normal" />
            </label>
            <label className="mt-4 block text-xs font-semibold text-ink">Paid invoice or bank receipt <span className="font-normal text-mute">(PDF, PNG or JPG, max 10 MB)</span>
              <input type="file" name="proof" accept="application/pdf,image/png,image/jpeg" className="mt-1.5 block w-full text-xs text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink" />
            </label>
            {meta.proofFileName && <p className="mt-2 text-[11px] text-mute">Already attached: <a href={`/api/payments/proof/${openInvoice.id}`} className="font-semibold text-navy">{meta.proofFileName}</a></p>}
            <button className="mt-5 w-full rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white">{underReview ? "Resubmit for verification" : "Submit payment for verification"}</button>
          </form>
        </div>
      )}
    </section>
  );
}
