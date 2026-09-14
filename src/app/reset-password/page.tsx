import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=" + encodeURIComponent("That reset link is invalid or expired. Request a new password reset email."));

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <div className="rounded-2xl border border-hair bg-white p-6">
          <h1 className="text-xl font-semibold text-ink">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Use at least 8 characters. After updating it, you&apos;ll sign in again with the new password.</p>
          {searchParams.error ? <div className="mt-4 rounded-lg bg-[#FBEAEA] px-3 py-2 text-xs leading-5 text-[#B3261E]">{searchParams.error}</div> : null}
          <form action={updatePassword} className="mt-5 space-y-3">
            <input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="New password" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required placeholder="Confirm password" className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none" />
            <button type="submit" className="w-full rounded-xl bg-navy py-2.5 text-sm font-medium text-white">Update password</button>
          </form>
        </div>
      </section>
    </main>
  );
}
