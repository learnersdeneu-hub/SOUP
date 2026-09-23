import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function money(value: unknown, currency?: string | null) {
  if (value === null || value === undefined) return "Not confirmed";
  const n = Number(value);
  return `${currency || ""} ${Number.isFinite(n) ? n.toLocaleString() : String(value)}`.trim();
}

export default async function ComparePlanPage({ params }: { params: { id: string } }) {
  const { profile } = await requireProfile();
  const plan = await prisma.universityShortlist.findFirst({
    where: { id: params.id, profileId: profile.id },
    include: { items: { orderBy: { position: "asc" }, include: { university: true, program: true } } },
  });
  if (!plan) return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-4xl px-5 py-10"><p className="text-sm text-mute">Plan not found.</p></main></div>;

  const selected = plan.items.filter((item) => ["KEEP", "FINALIST"].includes(item.studentDecision || ""));
  const compare = (selected.length >= 2 ? selected : plan.items.filter((item) => item.studentDecision !== "REMOVE")).slice(0, 3);
  const names = compare.map((item) => item.university.name).join(", ");
  type CompareItem = (typeof compare)[number];
  const rows: Array<[string, (item: CompareItem) => string]> = [
    ["Country", (item) => `${item.university.city ? `${item.university.city}, ` : ""}${item.university.country}`],
    ["Program", (item) => item.program?.title || "Not confirmed"],
    ["Level", (item) => item.program?.level || "Not confirmed"],
    ["Tuition", (item) => money(item.program?.tuitionAmount, item.program?.tuitionCurrency)],
    ["Intake", (item) => item.program?.intake || "Not confirmed"],
    ["Application route", (item) => item.isPartnerAtGeneration ? "SOUP-managed network option" : "Guided / independent option"],
    ["Eligibility", (item) => item.eligibilityStatus ? item.eligibilityStatus.replaceAll("_", " ") : "Needs review"],
    ["Why it fits", (item) => item.rationale || "Ask Noodles for the reasoning"],
  ];

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <Link href={`/plans/${plan.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/> Back to matches</Link>
    <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">Compare</div><h1 className="mt-1 text-2xl font-semibold text-ink">Your strongest choices, side by side</h1><p className="mt-2 text-sm text-mute">Keep up to three serious choices visible at once. Noodles sees the same saved decisions.</p></div><Link href={`/counselor?prompt=${encodeURIComponent(`Compare these universities for me and tell me which three I should prioritize: ${names}`)}`} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white"><MessageCircle size={13}/> Ask Noodles to compare</Link></div>
    {compare.length < 2 ? <div className="mt-6 rounded-2xl border border-hair bg-white p-8 text-sm text-mute">Keep at least two universities on your shortlist before comparing.</div> : <div className="mt-6 overflow-x-auto rounded-2xl border border-hair bg-white"><table className="min-w-[820px] w-full text-left text-xs"><thead><tr className="border-b border-hair bg-[#FAFAFA]"><th className="p-4 text-mute">Factor</th>{compare.map((item) => <th key={item.id} className="p-4 text-sm font-semibold text-ink">{item.university.name}</th>)}</tr></thead><tbody>{rows.map(([label, getter]) => <tr key={label} className="border-b border-hair last:border-0"><td className="p-4 font-semibold text-mute">{label}</td>{compare.map((item) => <td key={item.id} className="p-4 align-top leading-5 text-ink">{getter(item)}</td>)}</tr>)}</tbody></table></div>}
    <div className="mt-5 rounded-2xl bg-[#F4FAF8] p-4 text-xs leading-5 text-teal"><CheckCircle2 size={14} className="mr-2 inline"/>A sensible final three should balance fit, affordability, timing and admission risk. SOUP-network status is an advantage when the university genuinely fits, not a substitute for eligibility.</div>
  </main></div>;
}
