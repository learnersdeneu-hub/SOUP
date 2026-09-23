import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function State({ ok, optional = false }: { ok: boolean; optional?: boolean }) {
  const label = ok ? "Configured" : optional ? "Optional" : "Required";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${ok ? "bg-emerald-50 text-emerald-800" : optional ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"}`}>{label}</span>;
}

export default async function AdminSettingsPage() {
  await requireRole(ADMIN_ROLES);
  const rows = [
    ["Supabase URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), false],
    ["Supabase publishable key", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), false],
    ["Supabase server secret", Boolean(process.env.SUPABASE_SECRET_KEY), false],
    ["Database pooled connection", Boolean(process.env.DATABASE_URL), false],
    ["Database migration connection", Boolean(process.env.DIRECT_URL), false],
    ["Public site URL", Boolean(process.env.NEXT_PUBLIC_SITE_URL), false],
    ["Gemini API key", Boolean(process.env.GEMINI_API_KEY), false],
    ["AI rate-limit salt", Boolean(process.env.SOUP_RATE_LIMIT_SALT), false],
    ["Transactional email (Resend)", Boolean(process.env.RESEND_API_KEY && process.env.SOUP_EMAIL_FROM), true],
    ["Stripe checkout", Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET), true],
    ["SOUP support email", Boolean(process.env.SOUP_SUPPORT_EMAIL), false],
    ["WhatsApp support number", Boolean(process.env.NEXT_PUBLIC_SOUP_WHATSAPP), false],
  ] as const;

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Runtime settings</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Configuration presence only. Secret values are never rendered in the browser.</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white">
          {rows.map(([label, ok, optional]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-hair px-5 py-4 last:border-0"><span className="min-w-0 text-sm font-medium text-ink">{label}</span><State ok={ok} optional={optional}/></div>)}
        </section>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-sm font-semibold text-ink">AI provider</div><p className="mt-2 text-xs leading-5 text-mute">Current selection: <strong>{process.env.AI_PROVIDER || "not configured"}</strong> · model <strong>{process.env.AI_MODEL || "provider default"}</strong>. Keys remain server-side.</p></div>
          <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-sm font-semibold text-ink">Authentication email</div><p className="mt-2 text-xs leading-5 text-mute">Confirmation and password-recovery emails are sent by Supabase Auth. Production also requires the correct Site URL, redirect URLs and SMTP/auth-email settings in Supabase.</p></div>
        </div>
      </main>
    </div>
  );
}
