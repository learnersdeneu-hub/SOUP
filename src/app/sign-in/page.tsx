import { LandingNav } from "@/components/landing/LandingNav";
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
export default function SignInPage({ searchParams }: { searchParams: { error?: string; next?: string; reset?: string } }) {
  const next = safeNext(searchParams.next);
  const signUpHref = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";
  return (
    <div className="min-h-screen bg-paper">
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
