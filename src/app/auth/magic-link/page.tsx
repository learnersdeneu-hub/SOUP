import { BrandLogo } from "@/components/BrandLogo";
import { MagicLinkHandler } from "@/components/auth/MagicLinkHandler";

// Empty (not "/dashboard") when no explicit next was baked into the emailed
// link — completeEmailLinkSignIn/completeEmailLinkCode treat that as "apply
// determinePostLoginLanding()" rather than always landing on the dashboard.
function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

export const dynamic = "force-dynamic";

export default function MagicLinkPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next);
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <MagicLinkHandler next={next} />
      </div>
    </div>
  );
}
