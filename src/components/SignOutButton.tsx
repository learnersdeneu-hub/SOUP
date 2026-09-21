"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { clearLocalStudentDrafts } from "@/lib/client/localDrafts";

// Wraps the existing signOut server action (still does the real work: ending
// the Supabase session and redirecting) with a client-side step it cannot do
// itself — clearing browser-local drafts before the next person can sign in
// on this device. Runs synchronously in the form's submit handler, before
// the server action's own submission proceeds.
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => clearLocalStudentDrafts()}>
      <button type="submit" aria-label="Sign out" title="Sign out" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-ink hover:bg-white sm:px-4">
        <LogOut size={15} className="sm:hidden" /><span className="hidden sm:inline">Sign Out</span>
      </button>
    </form>
  );
}
