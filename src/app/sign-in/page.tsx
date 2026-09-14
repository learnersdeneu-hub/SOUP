import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { signIn, signInWithGoogle } from "@/app/actions/auth";

function safeNext(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function SignInPage({ searchParams }: { searchParams: { error?: string; next?: string; reset?: string } }) {
  const next = safeNext(searchParams.next);
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <h1 className="text-xl font-medium text-ink mb-6 text-center">Sign in to SOUP</h1>
        {searchParams.error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{searchParams.error}</div>}
        {searchParams.reset && <div className="mb-4 rounded-lg border border-hair bg-[#EAF5F3] px-3 py-2 text-xs leading-5 text-teal">Password updated. Sign in with your new password.</div>}
        <form action={signInWithGoogle} className="mb-4"><input type="hidden" name="next" value={next} /><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-hair bg-white py-2.5 text-sm font-medium text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-hair text-[10px] font-bold">G</span> Continue with Google</button></form><div className="mb-4 flex items-center gap-3"><div className="h-px flex-1 bg-hair"/><span className="text-[10px] uppercase tracking-[.12em] text-mute">or</span><div className="h-px flex-1 bg-hair"/></div><form action={signIn} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <input name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
          <input name="password" type="password" autoComplete="current-password" required placeholder="Password" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
          <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy">Sign In</button>
        </form>
        <div className="mt-4 text-center"><Link href="/forgot-password" className="text-xs font-medium text-navy">Forgot password?</Link></div>
        <p className="text-xs text-mute text-center mt-3">Don&apos;t have an account? <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="text-navy font-medium">Sign up for free</Link></p>
      </div>
    </div>
  );
}
