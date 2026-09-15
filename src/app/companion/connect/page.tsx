import Link from "next/link";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { CompanionConnect } from "@/components/companion/CompanionConnect";
import { revokeCompanionDevice } from "@/app/actions/companion";

export default async function CompanionConnectPage() {
  const { profile } = await requireProfile();
  const devices = await prisma.companionDevice.findMany({
    where: { profileId: profile.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Companion</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Connect the browser extension</h1>
        <p className="mt-2 text-sm leading-6 text-mute">SOUP Companion helps you fill out university, visa and accommodation application forms directly on the official site, using information already saved in your SOUP account. Generate a one-time code below, then enter it into the Companion side panel.</p>
        <div className="mt-6"><CompanionConnect /></div>

        <div className="mt-8 rounded-2xl border border-hair bg-white p-5">
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

        <div className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="text-xs font-semibold text-ink">What Companion can see</div>
          <p className="mt-2 text-xs leading-5 text-mute">Your name, date of birth, nationality, country of residence and the study preferences you've told Noodles, plus a list of your uploaded documents (never the raw files, only metadata — you approve opening any document from the panel). Companion never submits an application on your behalf and never fills a field without your review.</p>
          <Link href="/companion/privacy" className="mt-3 inline-block text-[11px] font-semibold text-navy">Read the full Companion privacy notice</Link>
        </div>
      </main>
    </div>
  );
}
