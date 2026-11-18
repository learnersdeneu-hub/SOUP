"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";

// Must match PAYMENT_REQUIRED_HEADER in lib/payments/access.ts (not imported:
// that module is server-only).
const HEADER = "X-SOUP-Payment-Required";
let installed = false;

// Mounted once in the root layout. Every upload/submission API answers 402
// with HEADER when the student hasn't paid yet; rather than teaching each of
// the ~15 upload and submit components about payments, this watches same-
// origin fetches and opens one consistent payment prompt. The component that
// made the request still gets the response and shows its own error text.
export function PaymentRequiredWatcher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    const original = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args);
      if (response.status === 402 && response.headers.get(HEADER)) window.dispatchEvent(new Event("soup:payment-required"));
      return response;
    };
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("soup:payment-required", show);
    return () => window.removeEventListener("soup:payment-required", show);
  }, []);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="payment-required-title" className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1E6] text-[#B23C0B]"><Lock size={18} /></span>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-1 text-mute hover:bg-paper"><X size={18} /></button>
        </div>
        <h2 id="payment-required-title" className="mt-4 text-lg font-semibold text-ink">Unlock uploads and submissions</h2>
        <p className="mt-2 text-sm leading-6 text-mute">Uploading documents, submitting applications, accommodation and insurance requests and SOUP Companion need the one-time <b className="text-ink">$20 SOUP Scholar</b> payment. Everything you&apos;ve entered is saved.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-mute">
          <li>Download your invoice in Payments.</li>
          <li>Pay by bank transfer to the account on the invoice.</li>
          <li>Submit your transaction reference or the paid invoice.</li>
        </ol>
        <div className="mt-5 flex gap-2">
          <Link href="/payments?required=1#invoice" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-navy px-4 py-2.5 text-center text-sm font-semibold text-white">Go to Payments</Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-hair px-4 py-2.5 text-sm font-semibold text-ink">Not now</button>
        </div>
      </div>
    </div>
  );
}
