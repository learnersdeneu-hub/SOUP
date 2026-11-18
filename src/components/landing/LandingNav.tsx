import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const LINKS = [
  ["About", "#about"],
  ["Inside SOUP", "#inside"],
  ["Partners", "#partners"],
  ["Packages", "#packages"],
  ["Journal", "#journal"],
] as const;

// anchorBase is "" on the landing page itself and "/sign-in" on other public
// pages (the Journal), so the section links still lead somewhere.
export function LandingNav({ signUpHref, anchorBase = "" }: { signUpHref: string; anchorBase?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hair/70 bg-paper/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-5 sm:px-8">
        <BrandLogo priority />
        <nav aria-label="Landing" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={`${anchorBase}${href}`} className="rounded-full px-3.5 py-2 text-sm font-semibold text-mute no-underline transition hover:bg-white hover:text-ink">{label}</a>
          ))}
          <Link href="/guides" className="rounded-full px-3.5 py-2 text-sm font-semibold text-mute no-underline transition hover:bg-white hover:text-ink">Guides</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/guides" className="rounded-full px-3 py-2 text-sm font-bold text-ink no-underline hover:bg-white lg:hidden">Guides</Link>
          <a href={`${anchorBase}#signin`} className="rounded-full px-4 py-2 text-sm font-bold text-ink no-underline hover:bg-white">Sign in</a>
          <Link href={signUpHref} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white no-underline shadow-[0_8px_20px_-8px_rgba(20,33,61,.6)] transition hover:-translate-y-px">Request access</Link>
        </div>
      </div>
    </header>
  );
}
