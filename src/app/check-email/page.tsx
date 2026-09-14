import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function CheckEmailPage({ searchParams }: { searchParams: { email?: string; next?: string } }) {
  const next = searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//") ? searchParams.next : "/dashboard";
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <section className="w-full max-w-md text-center">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <div className="rounded-2xl border border-hair bg-white p-7">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal">Almost there</div>
          <h1 className="text-xl font-semibold text-ink">Check your email</h1>
          <p className="mt-3 break-words text-sm leading-6 text-mute">We sent a confirmation link{searchParams.email ? ` to ${searchParams.email}` : ""}. Open it to activate your account. Your SOUP progress will be waiting when you return.</p>
          <p className="mt-2 text-xs leading-5 text-mute">If you don&apos;t see it within a few minutes, check your spam or junk folder.</p>
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
