import { BrandLogo } from "@/components/BrandLogo";
import { SignInCard } from "@/components/auth/SignInCard";

function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
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
