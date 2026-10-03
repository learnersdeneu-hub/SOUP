"use client";

import { useState } from "react";
import Link from "next/link";
import { submitAccessRequest } from "@/app/actions/accessRequests";

const inputClass = "w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none";

// Students can no longer create their own account. This form only records a
// request (name, email, institution) and emails SOUP's team — see
// submitAccessRequest in src/app/actions/accessRequests.ts. A staff member
// reviews it in /admin/access-requests; approving sends the student a
// sign-in link. Nothing here touches Supabase Auth.
export function SignUpCard({ subtitle }: { next: string; subtitle: string }) {
  const [step, setStep] = useState<"details" | "sent">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !institutionName.trim()) {
      setError("Full name, email and institution name are all required.");
      return;
    }
    setSending(true);
    setError(null);
    const form = new FormData();
    form.set("fullName", fullName);
    form.set("email", email);
    form.set("institutionName", institutionName);
    const result = await submitAccessRequest(form);
    setSending(false);
    if (!result.ok) { setError(result.error); return; }
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <div>
        <h1 className="text-xl font-medium text-ink mb-2 text-center">Request received</h1>
        <p className="mb-6 text-center text-xs leading-5 text-mute">
          Thanks, {fullName.split(" ")[0] || "there"}. We've sent your request to the SOUP team. If it's approved, we'll email
          a sign-in link to <span className="font-semibold text-ink">{email}</span> — no need to do anything else until then.
        </p>
        <p className="text-xs text-mute text-center"><Link href="/sign-in" className="text-navy font-medium">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink mb-2 text-center">Request access to SOUP</h1>
      <p className="mb-6 text-center text-xs leading-5 text-mute">{subtitle}</p>
      {error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>}
      <form onSubmit={submitDetails} className="space-y-3">
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" autoComplete="name" required placeholder="Full name" className={inputClass} />
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="Email" className={inputClass} />
        <input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} type="text" autoComplete="organization" required placeholder="Institution name (school, college, university...)" className={inputClass} />
        <button type="submit" disabled={sending} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy disabled:opacity-60">{sending ? "Sending…" : "Request access"}</button>
      </form>
      <p className="text-xs text-mute text-center mt-4">Already approved? <Link href="/sign-in" className="text-navy font-medium">Sign in</Link></p>
    </div>
  );
}
