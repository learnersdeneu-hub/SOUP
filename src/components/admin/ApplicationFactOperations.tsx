"use client";
import { useState } from "react";

export function ApplicationFactOperations({ applicationId, feeStatus, eligibilityStatus, feeAmount, feeCurrency }: { applicationId: string; feeStatus: string; eligibilityStatus: string; feeAmount?: string | number | null; feeCurrency?: string | null }) {
  const [fee, setFee] = useState(feeStatus);
  const [eligibility, setEligibility] = useState(eligibilityStatus);
  const [amount, setAmount] = useState(feeAmount == null ? "" : String(feeAmount));
  const [currency, setCurrency] = useState(feeCurrency || "USD");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    const reason = window.prompt("Add the source/review note supporting this eligibility/fee update");
    if (!reason?.trim()) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/facts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationFeeStatus: fee, applicationFeeAmount: amount, applicationFeeCurrency: currency, eligibilityStatus: eligibility, reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not save application facts.");
      window.location.reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save application facts."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap items-center gap-2"><select value={eligibility} disabled={busy} onChange={(e) => setEligibility(e.target.value)} className="rounded-lg border border-hair bg-white px-2 py-2 text-[10px]"><option>NOT_CHECKED</option><option>LIKELY_ELIGIBLE</option><option>NEEDS_REVIEW</option><option>NOT_ELIGIBLE</option></select><select value={fee} disabled={busy} onChange={(e) => setFee(e.target.value)} className="rounded-lg border border-hair bg-white px-2 py-2 text-[10px]"><option>UNKNOWN</option><option>NOT_REQUIRED</option><option>REQUIRED</option><option>STUDENT_PAYING</option><option>SOUP_PAYING</option><option>PENDING</option><option>PAID</option><option>WAIVED</option><option>REFUNDED</option></select><input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Fee amount" inputMode="decimal" className="w-24 rounded-lg border border-hair bg-white px-2 py-2 text-[10px]"/><input value={currency} onChange={(e)=>setCurrency(e.target.value.toUpperCase().slice(0,3))} placeholder="USD" className="w-16 rounded-lg border border-hair bg-white px-2 py-2 text-[10px]"/><button onClick={save} disabled={busy} className="rounded-lg bg-navy px-3 py-2 text-[10px] font-semibold text-white">{busy ? "Saving…" : "Save review"}</button>{message && <span className="text-[10px] text-red-700">{message}</span>}</div>;
}
