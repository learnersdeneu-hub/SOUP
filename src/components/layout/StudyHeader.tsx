"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, Settings, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { signOut } from "@/app/actions/auth";
import { clearLocalStudentDrafts } from "@/lib/client/localDrafts";

const NAV = [
  { key: "home", href: "/", label: "Home" },
  { key: "explore", href: "/universities", label: "Explore" },
  { key: "noodles", href: "/counselor", label: "Noodles" },
  { key: "companion", href: "/companion/connect", label: "Companion" },
  { key: "dashboard", href: "/dashboard", label: "My SOUP" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase() || "S";
}

// Shared top nav for the redesigned home/dashboard/Noodles/insurance pages
// (see the "SOUP Homepage Redesign" design canvas) — a simpler, 4-link
// horizontal pattern distinct from the app-wide StudentSidebar drawer
// (which covers every destination). Intentionally scoped to these pages
// rather than replacing Header globally: the rest of the app keeps its
// existing sidebar nav, while these pages adopt the new visual language.
export function StudyHeader({ current, signedIn, fullName, unreadCount = 0 }: { current?: (typeof NAV)[number]["key"]; signedIn: boolean; fullName?: string | null; unreadCount?: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="bg-white border-b border-hair">
      {/* A single row that never wraps, at every width — the nav links
          used to live inline here with their own flex-wrap, which on a
          narrow phone meant two nested wrapping flex containers fighting
          each other, stacking into a tall overlapping mess instead of a
          clean bar. Below sm, links move into the collapsible panel under
          the header instead of trying to fit inline. */}
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5 xl:px-10">
        <BrandLogo className="h-9 shrink-0 sm:h-11" />
        <nav aria-label="Main" className="ml-6 hidden flex-1 flex-wrap gap-1 sm:flex">
          {NAV.map((item) => {
            const active = item.key === current;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-[10px] px-3.5 py-2.5 text-[15px] no-underline ${active ? "bg-[#E8F4EF] font-bold text-teal" : "font-semibold text-mute hover:bg-paper"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hair bg-white text-ink sm:hidden"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {signedIn ? (
          <div className="flex items-center gap-2">
            <Link href="/notifications" aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-hair bg-white">
              <Bell size={20} className="text-ink" aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D9480F]" />}
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-11 items-center gap-2.5 rounded-[22px] border border-hair bg-white py-0 pl-1.5 pr-1.5 font-sans text-sm font-semibold text-ink sm:pr-3.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F3FA8] text-[13px] font-bold text-white">{initials(fullName || "SOUP")}</span>
                <span className="hidden sm:inline">{fullName ? fullName.split(" ")[0] : "My SOUP"}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 rounded-2xl border border-hair bg-white p-1.5 shadow-lg">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink no-underline hover:bg-paper">My SOUP dashboard</Link>
                    <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink no-underline hover:bg-paper"><Settings size={14} />Account settings</Link>
                    <form action={signOut} onSubmit={() => clearLocalStudentDrafts()}>
                      <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-paper"><LogOut size={14} />Sign out</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-semibold text-ink no-underline hover:bg-paper">Sign In</Link>
            <Link href="/sign-up" className="rounded-full border border-hair px-4 py-2 text-sm font-semibold text-ink no-underline">Request Access</Link>
          </div>
        )}
        </div>
      </div>
      {navOpen && (
        <nav aria-label="Main (mobile)" className="flex flex-col gap-1 border-t border-hair px-4 py-3 sm:hidden">
          {NAV.map((item) => {
            const active = item.key === current;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className={`rounded-[10px] px-3.5 py-2.5 text-[15px] no-underline ${active ? "bg-[#E8F4EF] font-bold text-teal" : "font-semibold text-mute hover:bg-paper"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
