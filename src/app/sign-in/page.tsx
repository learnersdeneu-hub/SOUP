import { BrandLogo } from "@/components/BrandLogo";
import { SignInCard } from "@/components/auth/SignInCard";

// Empty (not "/dashboard") when nothing specific was requested — a
// still-exploring student's default landing is the home page, decided
// dynamically after sign-in by determinePostLoginLanding(), not hardcoded
// here. An explicit next (e.g. bounced off a protected page) is still
// always honored as-is.
function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "";
}

export default function SignInPage({ searchParams }: { searchParams: { error?: string; next?: string; reset?: string } }) {
  const next = safeNext(searchParams.next);
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <SignInCard next={next} errorMessage={searchParams.error} resetNotice={searchParams.reset === "1"} />
      </div>
    </div>
  );
}
