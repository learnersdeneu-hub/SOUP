import Link from "next/link";
import { Download } from "lucide-react";
import { StudyHeader } from "@/components/layout/StudyHeader";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { CompanionConnect } from "@/components/companion/CompanionConnect";
import { CompanionHowItWorks } from "@/components/companion/CompanionHowItWorks";
import { OpenWebCompanionButton } from "@/components/companion/OpenWebCompanionButton";
import { revokeCompanionDevice } from "@/app/actions/companion";
import { getPremiumStatus } from "@/lib/payments/status";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

// Served as a static file from public/downloads/ — see desktop/README.md
// for how to rebuild and replace it. Set back to null to hide/disable the
// download button again (e.g. while preparing a new release).
const DOWNLOAD_URL = "/downloads/soup-companion-setup.exe";

export default async function CompanionConnectPage() {
  const { profile, user } = await requireProfile();
  const [devices, { plusActive }] = await Promise.all([
    prisma.companionDevice.findMany({
      where: { profileId: profile.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getPremiumStatus(profile.id),
  ]);

  return (
    <div className="min-h-screen bg-paper">
      <StudyHeader current="companion" signedIn fullName={user.fullName} />
      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Companion</div>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-ink">Fill out applications without leaving the page</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Companion fills university, visa and accommodation forms using information already saved in your SOUP account — as a Windows desktop app with a built-in browser, or right in your phone or browser without installing anything.</p>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.15fr_420px]">
          {/* Left: what it is and how it works, in pictures — not just copy. */}
          <div className="rounded-[28px] border border-hair bg-white p-7 sm:p-9">
            <CompanionHowItWorks />
          </div>

          {/* Right: set it up. On a phone, the web option is the one that
              actually applies — these two cards swap order below the sm
              breakpoint via CSS alone (no device detection needed) so it's
              the first thing a phone visitor sees instead of a
              Windows-only download. */}
          <div className="flex flex-col gap-5">
            <div className="order-2 rounded-2xl border border-hair bg-white p-5 sm:order-1">
              <div className="text-xs font-semibold text-ink">Use it on your phone or any browser</div>
              <p className="mt-1 text-[11px] leading-5 text-mute">{plusActive ? "Open your SOUP answers in a browser tab you can copy from, or open alongside the real site on a computer." : "Available on SOUP Scholar and SOUP Concierge — a reference-only view of your SOUP answers, no install needed."}</p>
              <div className="mt-3">{plusActive ? <OpenWebCompanionButton /> : <Link href="/premium" className="inline-flex items-center gap-2 rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink">See SOUP Scholar</Link>}</div>
            </div>

            <div className="order-1 rounded-2xl border border-hair bg-white p-5 sm:order-2">
              <div className="text-xs font-semibold text-ink">Get the app (Windows)</div>
              {DOWNLOAD_URL ? (
                <a href={DOWNLOAD_URL} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white"><Download size={14} /> Download for Windows</a>
              ) : (
                <button disabled className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[#D8DDE2] px-4 py-2.5 text-xs font-semibold text-white"><Download size={14} /> Coming soon</button>
              )}
              <p className="mt-2 text-[11px] text-mute">Windows only for now. Once installed, generate a one-time code below and enter it into the app.</p>
            </div>

            <div>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">Pairing code</div>
              <CompanionConnect />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-white p-5">
            <div className="text-xs font-semibold text-ink">Connected devices</div>
            <p className="mt-2 text-xs leading-5 text-mute">Revoke access any time — a revoked device can no longer read your SOUP data or fill anything.</p>
            {devices.length === 0 ? (
              <p className="mt-4 text-xs text-mute">No devices connected yet.</p>
            ) : (
              <div className="mt-4 divide-y divide-hair">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-ink">{device.label || "SOUP Companion"}</div>
                      <div className="mt-1 text-[11px] text-mute">Connected {device.createdAt.toLocaleDateString()}{device.lastUsedAt ? ` · last used ${device.lastUsedAt.toLocaleDateString()}` : ""}</div>
                    </div>
                    <form action={revokeCompanionDevice.bind(null, device.id)}>
                      <button className="shrink-0 rounded-lg border border-hair px-3 py-2 text-[11px] font-semibold text-ink hover:border-navy">Revoke</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-hair bg-white p-5">
            <div className="text-xs font-semibold text-ink">What Companion can see</div>
            <p className="mt-2 text-xs leading-5 text-mute">Your name, date of birth, nationality, country of residence and the study preferences you've told Noodles, plus a list of your uploaded documents (never the raw files, only metadata — you approve opening any document from the panel). Companion never submits an application on your behalf and never fills a field without your review.</p>
            <Link href="/companion/privacy" className="mt-3 inline-block text-[11px] font-semibold text-navy">Read the full Companion privacy notice</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
