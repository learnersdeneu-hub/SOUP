import Link from "next/link";
import type { AppRole } from "@prisma/client";
import { Bell, LayoutDashboard, LifeBuoy } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { StudentSidebar } from "@/components/StudentSidebar";
import { SignOutButton } from "@/components/SignOutButton";

// `role` is optional and only ever passed by admin pages, which already have
// it on hand from their own requireRole() call — student-facing pages (the
// large majority of Header's call sites) never fetch it, so leaving it out
// costs them nothing. See StudentSidebar for what it's used for: without it,
// a staff member's only way to reach other admin sections was the "← Admin"
// back-link some admin pages happen to have at the top, which is exactly how
// a counselor ended up stuck on Document review with no way out on mobile.
export function Header({ signedIn, role }: { signedIn: boolean; role?: AppRole | null }) {
  return (
    <header className="flex min-h-[56px] w-full flex-shrink-0 items-center justify-between gap-2 px-3 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        <StudentSidebar signedIn={signedIn} role={role} />
        <BrandLogo priority className="min-w-0 shrink" />
      </div>
      <nav aria-label="Primary" className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <Link href="/premium" className="hidden rounded-full px-3 py-1.5 text-sm text-ink hover:bg-white sm:inline-flex">Plans</Link>
        {signedIn ? (
          <>
            <Link href="/support" aria-label="Support" title="Support" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><LifeBuoy size={15}/></Link>
            <Link href="/notifications" aria-label="Notifications" title="Notifications" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><Bell size={15}/></Link>
            <Link href="/dashboard" aria-label="My SOUP" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-ink hover:bg-white sm:px-4"><LayoutDashboard size={15} className="sm:hidden"/><span className="hidden sm:inline">My SOUP</span></Link>
            <SignOutButton/>
          </>
        ) : (
          <>
            <Link href="/sign-in?next=/support" aria-label="Support" title="Support" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white"><LifeBuoy size={15}/></Link>
            <Link href="/sign-in" className="rounded-full px-2.5 py-1.5 text-sm text-ink hover:bg-white sm:px-4">Sign In</Link>
            <Link href="/sign-up" className="hidden rounded-full border border-hair px-4 py-1.5 text-sm text-ink sm:inline-flex">Request Access</Link>
          </>
        )}
      </nav>
    </header>
  );
}
