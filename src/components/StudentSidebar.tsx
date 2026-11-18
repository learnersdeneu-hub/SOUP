"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@prisma/client";
import { Bell, BriefcaseBusiness, CreditCard, Download, FileUp, GraduationCap, LayoutDashboard, LifeBuoy, Menu, PlaneTakeoff, Search, ShieldCheck, X } from "lucide-react";
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
//
// A staff viewer (role passed in by the admin page rendering Header) also
// gets a single "Admin dashboard" entry here, on top of these student links
// — not a duplicated/hardcoded list of every admin section, which would
// drift out of sync with /admin's own already-correct, role-gated
// operations list. One link in, the real list lives in exactly one place.
export function StudentSidebar({ signedIn, role }: { signedIn: boolean; role?: AppRole | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!signedIn) return null;
  const isStaff = Boolean(role && role !== "CUSTOMER");

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
              {isStaff && (
                <>
                  <Link href="/admin" onClick={() => setOpen(false)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${pathname?.startsWith("/admin") ? "bg-[#EAF0F5] text-navy" : "text-navy hover:bg-paper"}`}>
                    <ShieldCheck size={15} />Admin dashboard
                  </Link>
                  <div className="my-2 border-t border-hair" />
                </>
              )}
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
