import Link from "next/link";
import { Bell, LayoutDashboard, LifeBuoy, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { StudentSidebar } from "@/components/StudentSidebar";
import { signOut } from "@/app/actions/auth";

export function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="flex min-h-[56px] w-full flex-shrink-0 items-center justify-between gap-2 px-3 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        <StudentSidebar signedIn={signedIn} />
        <BrandLogo priority className="min-w-0 shrink" />
      </div>
      <nav aria-label="Primary" className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <Link href="/premium" className="hidden rounded-full px-3 py-1.5 text-sm text-ink hover:bg-white sm:inline-flex">Plans</Link>
        {signedIn ? (
          <>
            <Link href="/support" aria-label="Support" title="Support" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><LifeBuoy size={15}/></Link>
            <Link href="/notifications" aria-label="Notifications" title="Notifications" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><Bell size={15}/></Link>
            <Link href="/dashboard" aria-label="My SOUP" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-ink hover:bg-white sm:px-4"><LayoutDashboard size={15} className="sm:hidden"/><span className="hidden sm:inline">My SOUP</span></Link>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" title="Sign out" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-ink hover:bg-white sm:px-4"><LogOut size={15} className="sm:hidden"/><span className="hidden sm:inline">Sign Out</span></button>
            </form>
          </>
        ) : (
          <>
            <Link href="/sign-in?next=/support" aria-label="Support" title="Support" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><LifeBuoy size={15}/></Link>
            <Link href="/sign-in" className="rounded-full px-2.5 py-1.5 text-sm text-ink hover:bg-white sm:px-4">Sign In</Link>
            <Link href="/sign-up" className="hidden rounded-full border border-hair px-4 py-1.5 text-sm text-ink sm:inline-flex">Sign Up for Free</Link>
          </>
        )}
      </nav>
    </header>
  );
}
