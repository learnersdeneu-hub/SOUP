"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, Mail, MessageCircle, X } from "lucide-react";
import { SOUP_SUPPORT_EMAIL, supportWhatsAppUrl } from "@/lib/support/config";

export function SupportLauncher({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 sm:left-auto sm:right-5">
      {open ? (
        <div className="mb-3 ml-auto w-full max-w-[320px] rounded-2xl border border-hair bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Need help?</div>
              <p className="mt-1 text-xs leading-5 text-mute">Reach the SOUP team without leaving your journey behind.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support" className="shrink-0 rounded-full p-1 text-mute hover:bg-paper"><X size={15}/></button>
          </div>
          <div className="mt-4 space-y-2">
            <Link href={signedIn ? "/support" : "/sign-in?next=/support"} className="flex items-center gap-3 rounded-xl bg-navy px-3 py-3 text-xs font-semibold text-white">
              <LifeBuoy size={15}/> {signedIn ? "Message SOUP support" : "Sign in to message support"}
            </Link>
            <a href={supportWhatsAppUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-hair px-3 py-3 text-xs font-semibold text-ink">
              <MessageCircle size={15}/> WhatsApp SOUP
            </a>
            <a href={`mailto:${SOUP_SUPPORT_EMAIL}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-hair px-3 py-3 text-xs font-semibold text-ink">
              <Mail size={15} className="shrink-0"/><span className="truncate">{SOUP_SUPPORT_EMAIL}</span>
            </a>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-mute">Account support requests also create an internal SOUP notification immediately.</p>
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="ml-auto flex h-12 items-center gap-2 rounded-full bg-navy px-4 text-xs font-semibold text-white shadow-lg" aria-expanded={open} aria-label={open ? "Close support options" : "Open support options"}>
        <LifeBuoy size={16}/> Support
      </button>
    </div>
  );
}
