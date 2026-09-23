import { BrandLogo } from "@/components/BrandLogo";
import { MagicLinkHandler } from "@/components/auth/MagicLinkHandler";

function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
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
