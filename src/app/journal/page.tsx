import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingSections";
import { JOURNAL_ARTICLES } from "@/lib/landing/journal";

export const metadata: Metadata = {
  title: "The SOUP Journal — guides for students studying abroad",
  description: "Practical articles on applications, money, visas, insurance and student housing.",
};

// Public (see PUBLIC_PATHS in proxy.ts): linked from the signed-out
// landing page, readable without an account.
export default function JournalIndexPage() {
  return (
    <div className="min-h-screen bg-paper">
      <LandingNav signUpHref="/sign-up" anchorBase="/sign-in" />
      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal">The SOUP Journal</span>
        <h1 className="m-0 mt-3 max-w-[760px] text-[38px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">Guides for students on the move.</h1>
        <p className="m-0 mt-4 max-w-[600px] text-[17px] leading-relaxed text-mute">Applications, money, visas, insurance and life abroad — explained simply.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNAL_ARTICLES.map((article) => (
            <Link key={article.slug} href={`/journal/${article.slug}`} className="group flex flex-col overflow-hidden rounded-[26px] border border-hair bg-white no-underline transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(20,33,61,.45)]">
              <div className="relative flex h-44 items-end overflow-hidden" style={{ background: `linear-gradient(135deg, ${article.cover.from}, ${article.cover.to})`, color: article.cover.ink }}>
                <div aria-hidden className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
                <span aria-hidden className="absolute right-6 top-5 text-5xl transition duration-500 group-hover:-rotate-6 group-hover:scale-110">{article.emoji}</span>
                <span className="relative m-5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] backdrop-blur-sm">{article.category}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="text-xs font-bold text-mute">{article.readMinutes} min read</span>
                <h2 className="m-0 mt-1.5 text-[20px] font-extrabold leading-snug tracking-[-0.01em] text-ink">{article.title}</h2>
                <p className="m-0 mt-2 text-[14px] leading-relaxed text-mute">{article.dek}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-ink">Read <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter anchorBase="/sign-in" />
    </div>
  );
}
