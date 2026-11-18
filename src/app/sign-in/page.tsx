import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { siteUrl } from "@/lib/guides/content";
import { OrganizationJsonLd } from "@/lib/seo/organization";
import { LandingHero } from "@/components/landing/LandingHero";
import { getPublishedGuides } from "@/lib/guides/content";
import { AboutSection, FaqSection, FinalCta, InsideSoupSection, JournalSection, LandingFooter, PackagesSection, PartnersSection, VideoSection } from "@/components/landing/LandingSections";

// Empty (not "/dashboard") when nothing specific was requested — a
// still-exploring student's default landing is the home page, decided
// dynamically after sign-in by determinePostLoginLanding(), not hardcoded
// here. An explicit next (e.g. bounced off a protected page) is still
// always honored as-is.
function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "";
}

// /sign-in is where every signed-out visitor lands (middleware redirects
// here), so it doubles as SOUP's public landing page: the sign-in card stays
// front and centre in the hero, and the rest of the page explains what SOUP
// is to students who don't have access yet.
// The landing page is served at "/" for signed-out visitors (see
// middleware.ts), so both URLs declare the homepage as canonical.
export function generateMetadata(): Metadata {
  const title = "SOUP (SoupAssist): AI-led university admissions for international students";
  const description = "SOUP, the Students Online University Portal, helps international students choose universities, prepare applications and plan visas, insurance and housing, with the Noodles AI counsellor, human counsellors and SOUP Companion.";
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/` },
    openGraph: { type: "website", url: `${siteUrl()}/`, title, description, siteName: "SOUP" },
  };
}

export default function SignInPage({ searchParams }: { searchParams: { error?: string; next?: string; reset?: string } }) {
  const next = safeNext(searchParams.next);
  const signUpHref = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";
  return (
    <div className="min-h-screen bg-paper">
      <OrganizationJsonLd />
      <LandingNav signUpHref={signUpHref} />
      <main>
        <LandingHero next={next} errorMessage={searchParams.error} resetNotice={searchParams.reset === "1"} />
        <VideoSection />
        <InsideSoupSection signUpHref={signUpHref} />
        <AboutSection />
        <PartnersSection />
        <PackagesSection signUpHref={signUpHref} />
        <JournalSection guides={getPublishedGuides()} />
        <FaqSection />
        <FinalCta signUpHref={signUpHref} />
      </main>
      <LandingFooter />
    </div>
  );
}
