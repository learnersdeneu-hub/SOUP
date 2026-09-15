"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BriefcaseBusiness, CreditCard, Download, FileUp, GraduationCap, LayoutDashboard, LifeBuoy, Menu, PlaneTakeoff, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LINKS: Array<[string, string, LucideIcon]> = [
  ["/dashboard", "My SOUP", LayoutDashboard],
  ["/counselor", "Noodles", GraduationCap],
  ["/universities", "Universities & Programs", Search],
  ["/applications", "Applications", BriefcaseBusiness],
  ["/documents", "Documents", FileUp],
  ["/visa", "Visa centre", PlaneTakeoff],
  ["/payments", "Payments", CreditCard],
  ["/companion/connect", "SOUP Companion", Download],
  ["/notifications", "Updates", Bell],
  ["/support", "Help & support", LifeBuoy],
];

// One reusable left-side drawer for student-facing navigation, mounted through
// the already-global Header so every student page gets it without per-page
// wiring. Distinct from ConversationSidebar, which is scoped to chat history
// inside Noodles/Resume — this is the app-wide nav, not a second competing one.
export function StudentSidebar({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!signedIn) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open navigation" title="Menu" className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink hover:bg-white">
        <Menu size={17} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <nav aria-label="Student navigation" className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.14em] text-teal">My SOUP</span>
              <button onClick={() => setOpen(false)} aria-label="Close navigation" className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-paper"><X size={15} /></button>
            </div>
            <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {LINKS.map(([href, label, Icon]) => {
                const active = pathname === href || (href !== "/dashboard" && Boolean(pathname?.startsWith(href)));
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[#EAF0F5] text-navy" : "text-ink hover:bg-paper"}`}>
                    <Icon size={15} />{label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
