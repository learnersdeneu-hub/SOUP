"use client";

import { useEffect, useState } from "react";

import { knownPartnerWebsite } from "@/lib/partners/knownWebsites";
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]?.toUpperCase()).join("");
}

function safeLogoUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// A logo that hotlink-blocks or is simply unreachable never fires the
// <img>'s onError in every browser (it can just sit at complete=false
// forever), which used to leave a permanently blank box instead of ever
// reaching the favicon/initials fallback below. This timeout treats "still
// not loaded after 4s" the same as an explicit error.
const LOAD_TIMEOUT_MS = 4000;

export function PartnerLogo({ name, websiteUrl, logoUrl, size = 38 }: { name: string; websiteUrl?: string | null; logoUrl?: string | null; size?: number }) {
  const site = safeLogoUrl(websiteUrl) || knownPartnerWebsite(name) || null;
  const explicit = safeLogoUrl(logoUrl);
  const favicon = site ? `https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(site)}` : null;

  // stage 0 = try the explicit logo (if any), 1 = try the favicon (if any
  // and different from the explicit URL), 2 = give up, show initials.
  const initialStage = explicit ? 0 : favicon ? 1 : 2;
  const [stage, setStage] = useState(initialStage);
  useEffect(() => setStage(initialStage), [explicit, favicon, initialStage]);

  const src = stage === 0 ? explicit : stage === 1 ? favicon : null;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);

  useEffect(() => {
    if (!src || loaded) return;
    const timer = setTimeout(() => setStage((current) => (current === stage ? stage + 1 : current)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [src, stage, loaded]);

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hair bg-white"
      style={{ width: size, height: size }}
      aria-label={`${name} logo`}
      title={name}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          width={Math.max(24, size - 10)}
          height={Math.max(24, size - 10)}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setStage((current) => current + 1)}
          className="max-h-[76%] max-w-[76%] object-contain"
        />
      ) : (
        <span className="px-1 text-center text-[10px] font-bold tracking-tight text-navy">{initials(name)}</span>
      )}
    </div>
  );
}
