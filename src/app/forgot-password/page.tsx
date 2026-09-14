import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string; sent?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <div className="rounded-2xl border border-hair bg-white p-6">
          <h1 className="text-xl font-semibold text-ink">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Enter your email and we&apos;ll send a secure reset link if an account exists for it.</p>
          {searchParams.error ? <div className="mt-4 rounded-lg bg-[#FBEAEA] px-3 py-2 text-xs text-[#B3261E]">{searchParams.error}</div> : null}
          {searchParams.sent ? <div className="mt-4 rounded-lg bg-[#EAF5F3] px-3 py-2 text-xs leading-5 text-teal">If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.</div> : null}
          <form action={requestPasswordReset} className="mt-5 space-y-3">
            <label className="block"><span className="sr-only">Email</span><input name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" /></label>
            <button type="submit" className="w-full rounded-xl bg-navy py-2.5 text-sm font-medium text-white">Send reset link</button>
          </form>
          <Link href="/sign-in" className="mt-4 block text-center text-xs font-medium text-navy">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
