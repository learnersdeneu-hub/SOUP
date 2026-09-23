import { BrandLogo } from "@/components/BrandLogo";
import { SignUpCard } from "@/components/auth/SignUpCard";

function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// A short, specific reason the guest was sent here (e.g. clicking attach in
// Noodles chat) makes the sign-in transition feel intentional rather than an
// unexplained interruption. Falls back to the generic subtitle otherwise.
const REASON_COPY: Record<string, string> = {
  "attach-document": "Create a free account to securely attach and save your application documents in My SOUP.",
};

export default function SignUpPage({ searchParams }: { searchParams: { next?: string; reason?: string } }) {
  const next = safeNext(searchParams.next);
  const subtitle = (searchParams.reason && REASON_COPY[searchParams.reason]) || "Save your work, return later and keep everything together in My SOUP.";
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <SignUpCard next={next} subtitle={subtitle} />
      </div>
    </div>
  );
}
