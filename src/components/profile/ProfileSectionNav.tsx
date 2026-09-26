"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Mirrors the "My Application Progress" section order in
// src/lib/applications/progress.ts (profile -> funding -> academic ->
// documents -> testing -> applications). Only the four dedicated
// profile/* form pages are included here — Documents and Selected
// Universities already have their own distinct pages/UI, not this form
// pattern, so a prev/next control there would not fit the same flow.
const FLOW = [
  { label: "Profile & Details", href: "/profile/details" },
  { label: "Funding & Sponsorship", href: "/profile/funding" },
  { label: "Education & Academic Background", href: "/profile/education" },
  { label: "Testing & Requirements", href: "/profile/testing" },
];

export function ProfileSectionNav({ current }: { current: string }) {
  const index = FLOW.findIndex((section) => section.href === current);
  const prev = index > 0 ? FLOW[index - 1] : null;
  const next = index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : null;
  if (!prev && !next) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-hair pt-4">
      {prev ? (
        <Link href={prev.href} className="group inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-[#16314F]">
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5"/>{prev.label}
        </Link>
      ) : <span/>}
      {next ? (
        <Link href={next.href} className="group inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-[#16314F]">
          {next.label}<ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5"/>
        </Link>
      ) : <span/>}
    </div>
  );
}
