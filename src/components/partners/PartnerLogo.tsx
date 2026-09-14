"use client";

import { useMemo, useState } from "react";

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

export function PartnerLogo({ name, websiteUrl, logoUrl, size = 38 }: { name: string; websiteUrl?: string | null; logoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const site = safeLogoUrl(websiteUrl) || knownPartnerWebsite(name) || null;
  const resolved = useMemo(() => {
    const explicit = safeLogoUrl(logoUrl);
    if (explicit) return explicit;
    return site ? `https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(site)}` : null;
  }, [logoUrl, site]);
  const favicon = failed ? null : resolved;

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hair bg-white"
      style={{ width: size, height: size }}
      aria-label={`${name} logo`}
      title={name}
    >
      {favicon ? (
        <img
          src={favicon}
          alt=""
          width={Math.max(24, size - 10)}
          height={Math.max(24, size - 10)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="max-h-[76%] max-w-[76%] object-contain"
        />
      ) : (
        <span className="px-1 text-center text-[10px] font-bold tracking-tight text-navy">{initials(name)}</span>
      )}
    </div>
  );
}

