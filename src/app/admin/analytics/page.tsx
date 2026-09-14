import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export default async function AdminAnalyticsPage(){
  await requireRole(ADMIN_ROLES);
  const [profiles,cases,shortlists,applications,submitted,offers,enrolled,plus,concierge] = await Promise.all([
    prisma.profile.count(), prisma.studentCase.count(), prisma.universityShortlist.count(), prisma.studentApplication.count(),
    prisma.studentApplication.count({where:{status:{in:["SUBMITTED","UNDER_REVIEW","OFFER_RECEIVED","CONDITIONAL_OFFER","ENROLLED"]}}}),
    prisma.studentApplication.count({where:{status:{in:["OFFER_RECEIVED","CONDITIONAL_OFFER","ENROLLED"]}}}),
    prisma.studentApplication.count({where:{status:"ENROLLED"}}),
    prisma.payment.count({where:{type:"PREMIUM_COUNSELING",status:"PAID"}}),
    prisma.payment.count({where:{type:"PREMIUM_COUNSELING",status:"PAID",OR:[{title:"SOUP Concierge"},{metadata:{path:["plan"],equals:"premium_plus"}}]}}),
  ]);
  const rows = [
    ["Profiles",profiles,"Registered profiles"],["Student cases",cases,"Counseling case created"],["Shortlists",shortlists,"At least one saved university plan"],["Applications",applications,"Application records created"],["Submitted / beyond",submitted,"Submission or later stage"],["Offers",offers,"Offer / conditional offer recorded"],["Enrolled",enrolled,"Enrollment recorded"],["Paid support plans",plus,"SOUP Plus or Concierge payments"],["Concierge",concierge,"High-touch paid cases"],
  ] as const;
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Funnel analytics</h1><p className="mt-2 text-sm text-mute">A lightweight operational funnel from counseling through enrollment and paid support.</p><section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label,value,note])=><div key={label} className="rounded-2xl border border-hair bg-white p-5"><div className="text-2xl font-semibold text-ink">{value}</div><div className="mt-2 text-xs font-semibold text-ink">{label}</div><div className="mt-1 text-[11px] leading-5 text-mute">{note}</div></div>)}</section><section className="mt-5 rounded-2xl border border-hair bg-white p-5"><h2 className="text-sm font-semibold text-ink">How to read this</h2><p className="mt-2 text-xs leading-5 text-mute">These are operational counts, not admissions success rates. They are designed to show where students are dropping out of the SOUP journey so the team can improve counseling, applications and follow-up.</p></section></main></div>
}
