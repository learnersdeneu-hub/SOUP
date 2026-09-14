import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { signUp, signInWithGoogle } from "@/app/actions/auth";

function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// A short, specific reason the guest was sent here (e.g. clicking attach in
// Noodles chat) makes the sign-in transition feel intentional rather than an
// unexplained interruption. Falls back to the generic subtitle otherwise.
const REASON_COPY: Record<string, string> = {
  "attach-document": "Create a free account to securely attach and save your application documents in My SOUP.",
};

export default function SignUpPage({ searchParams }: { searchParams: { error?: string; next?: string; reason?: string } }) {
  const next = safeNext(searchParams.next);
  const subtitle = (searchParams.reason && REASON_COPY[searchParams.reason]) || "Save your work, return later and keep everything together in My SOUP.";
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <h1 className="text-xl font-medium text-ink mb-2 text-center">Create your free SOUP account</h1>
        <p className="mb-6 text-center text-xs leading-5 text-mute">{subtitle}</p>
        {searchParams.error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{searchParams.error}</div>}
        <form action={signInWithGoogle} className="mb-4"><input type="hidden" name="next" value={next} /><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-hair bg-white py-2.5 text-sm font-medium text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-hair text-[10px] font-bold">G</span> Continue with Google</button></form><div className="mb-4 flex items-center gap-3"><div className="h-px flex-1 bg-hair"/><span className="text-[10px] uppercase tracking-[.12em] text-mute">or</span><div className="h-px flex-1 bg-hair"/></div><form action={signUp} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <input name="fullName" type="text" autoComplete="name" required placeholder="Full name" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
          <input name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
          <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Password (min. 8 characters)" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
          <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy">Sign Up for Free</button>
        </form>
        <p className="text-xs text-mute text-center mt-4">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="text-navy font-medium">Sign in</Link></p>
      </div>
    </div>
  );
}
