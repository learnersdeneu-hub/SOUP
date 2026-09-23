"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/account";

const DISMISS_KEY = "soup_institution_prompt_dismissed_v1";

// For existing accounts that predate the institutionName field: they are
// never blocked from signing in or using SOUP over this, only prompted once
// per browser session (sessionStorage, not a hard gate) to fill it in —
// matching "should be allowed to sign in and then be prompted once", not
// "must provide this before continuing".
export function InstitutionPromptBanner({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [institutionName, setInstitutionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  }

  async function save() {
    if (!institutionName.trim()) { setError("Enter your institution name."); return; }
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("fullName", fullName);
      form.set("institutionName", institutionName);
      await updateCustomerProfile(form);
      dismiss();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your institution name.");
    } finally {
      setSaving(false);
    }
  }

  if (dismissed) return null;

  return (
    <section className="mt-5 rounded-2xl border border-[#C9D8E6] bg-[#F7FAFC] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">One quick thing</div>
          <h2 className="mt-1 text-sm font-semibold text-ink">What's your school, college or university?</h2>
          <p className="mt-1 text-xs leading-5 text-mute">We didn't collect this when your account was created. It helps SOUP and your counselor understand your context.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={institutionName}
              onChange={(event) => { setInstitutionName(event.target.value); setError(null); }}
              placeholder="Institution name"
              className="w-full min-w-0 flex-1 rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40"
            />
            <button onClick={save} disabled={saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
        </div>
        <button onClick={dismiss} aria-label="Dismiss for now" title="Not now" className="shrink-0 text-mute hover:text-ink"><X size={15} /></button>
      </div>
    </section>
  );
}
