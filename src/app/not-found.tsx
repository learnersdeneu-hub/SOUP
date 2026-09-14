import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <section className="w-full max-w-md text-center">
        <div className="mb-7 flex justify-center"><BrandLogo priority /></div>
        <div className="rounded-2xl border border-hair bg-white p-7">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">404</div>
          <h1 className="mt-2 text-xl font-semibold text-ink">This page isn&apos;t available</h1>
          <p className="mt-2 text-sm leading-6 text-mute">The link may be old, or the item may no longer be available in your SOUP workspace.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className="rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">My SOUP</Link>
            <Link href="/" className="rounded-xl border border-hair px-4 py-2.5 text-xs font-semibold text-ink">Home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
