import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingSections";
import { JOURNAL_ARTICLES, getJournalArticle } from "@/lib/landing/journal";

export function generateStaticParams() {
  return JOURNAL_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const article = getJournalArticle(params.slug);
  return article ? { title: `${article.title} — The SOUP Journal`, description: article.dek } : {};
}

export default async function JournalArticlePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const article = getJournalArticle(params.slug);
  if (!article) notFound();
  const more = JOURNAL_ARTICLES.filter((other) => other.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-paper">
      <LandingNav signUpHref="/sign-up" anchorBase="/sign-in" />
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${article.cover.from}, ${article.cover.to})`, color: article.cover.ink }}>
        <div aria-hidden className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-24 left-1/4 h-60 w-60 rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-[760px] px-5 pb-14 pt-10 sm:px-8 sm:pb-20">
          <Link href="/journal" className="inline-flex items-center gap-1.5 text-sm font-bold no-underline opacity-80 hover:opacity-100" style={{ color: article.cover.ink }}><ArrowLeft size={15} />The SOUP Journal</Link>
          <div className="mt-8 text-6xl" aria-hidden>{article.emoji}</div>
          <span className="mt-5 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]">{article.category} · {article.readMinutes} min read</span>
          <h1 className="m-0 mt-4 text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">{article.title}</h1>
          <p className="m-0 mt-4 text-[18px] leading-relaxed opacity-85">{article.dek}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
        <article className="space-y-8 text-[17px] leading-[1.75] text-ink">
          {article.body.map((section, index) => (
            <section key={section.heading || index}>
              {section.heading && <h2 className="m-0 mb-3 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{section.heading}</h2>}
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="m-0 mt-3 text-[#2B3550]">{paragraph}</p>)}
              {section.bullets && (
                <ul className="m-0 mt-4 space-y-2.5 pl-0">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex list-none gap-3 text-[#2B3550]"><span className="mt-[11px] h-2 w-2 shrink-0 rounded-full" style={{ background: article.cover.from }} />{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <div className="mt-14 rounded-[28px] bg-ink p-7 text-white sm:p-9">
          <h2 className="m-0 text-[24px] font-extrabold leading-tight">Do this with Noodles, inside SOUP.</h2>
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-white/75">Request access and your AI counselor turns this guide into a personal checklist for your destination and intake.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-ink no-underline">Request access <ArrowRight size={15} /></Link>
            <Link href="/sign-in#signin" className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-sm font-bold text-white no-underline">Sign in</Link>
          </div>
        </div>

        <h2 className="m-0 mt-16 text-[22px] font-extrabold text-ink">Keep reading</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {more.map((other) => (
            <Link key={other.slug} href={`/journal/${other.slug}`} className="group overflow-hidden rounded-[22px] border border-hair bg-white no-underline transition hover:-translate-y-0.5">
              <div className="flex h-24 items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${other.cover.from}, ${other.cover.to})` }} aria-hidden>{other.emoji}</div>
              <div className="p-4">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-teal">{other.category}</span>
                <h3 className="m-0 mt-1 text-[15px] font-extrabold leading-snug text-ink">{other.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter anchorBase="/sign-in" />
    </div>
  );
}
