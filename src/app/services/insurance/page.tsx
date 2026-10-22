import Link from "next/link";
import { CircleAlert, ShieldCheck } from "lucide-react";
import { StudyHeader } from "@/components/layout/StudyHeader";
import { InsurancePartnerButton } from "@/components/services/InsurancePartnerButton";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { saveStudentServiceNeeds } from "@/app/actions/referrals";

type InsurancePolicy = { name?: unknown; description?: unknown; price?: unknown; url?: unknown };
function policiesFromMetadata(value: unknown): InsurancePolicy[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = (value as Record<string, unknown>).policies;
  return Array.isArray(raw) ? raw as InsurancePolicy[] : [];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]?.toUpperCase()).join("");
}

export default async function InsuranceServicePage({ searchParams }: { searchParams: { source?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await prisma.profile.findUnique({ where: { userId: user.id }, include: { user: true } }) : null;
  const partner = await prisma.partner.findFirst({ where: { type: "INSURANCE", status: "ACTIVE", slug: "hellenic-sun-insuremart" }, orderBy: { internalPriority: "asc" } });
  const url = partner?.transactionUrl || "https://insuremart.pk/";
  const policies = policiesFromMetadata(partner?.publicMetadata);
  const source = searchParams.source === "counselor" ? "COUNSELOR" : "INSURANCE_PAGE";

  return (
    <div className="min-h-screen bg-paper">
      <StudyHeader signedIn={Boolean(user)} fullName={profile?.user.fullName}/>
      <main className="mx-auto max-w-[1600px] px-5 pb-28 pt-6 sm:px-6 xl:px-10">
        <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-mute">
          <Link href="/" className="text-mute no-underline">Home</Link><span aria-hidden="true">/</span>
          <span>Student insurance</span><span aria-hidden="true">/</span>
          <span className="font-bold text-ink">Travel quotes</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[32px] font-extrabold tracking-tight text-ink sm:text-[34px]">Travel insurance for your visa</h1>
            <p className="m-0 text-[15px] text-mute">Schengen-approved plans, reviewed by our insurance partner before your policy is issued.</p>
          </div>
          <span className="flex items-center gap-2 rounded-xl border border-hair bg-white px-3 py-2 text-[13px] font-semibold text-mute"><ShieldCheck size={15} className="text-teal"/>Quotes powered by <strong className="text-ink">insuremart</strong></span>
        </div>

        {user && (
          <section aria-label="Your trip" className="mt-5 rounded-[20px] border border-hair bg-white p-5">
            <form action={saveStudentServiceNeeds.bind(null, "INSURANCE")} className="flex flex-wrap items-end gap-6">
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-mute">Destination</span><input name="destination" placeholder="Schengen area" className="h-10 rounded-lg border border-hair px-2.5 text-sm font-bold text-ink outline-none focus:border-navy/40"/></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-mute">Visa / study purpose</span><input name="visaType" placeholder="e.g. Student visa" className="h-10 rounded-lg border border-hair px-2.5 text-sm font-bold text-ink outline-none focus:border-navy/40"/></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-mute">Departure</span><input type="date" name="coverageStart" className="h-10 rounded-lg border border-hair px-2.5 text-sm font-bold text-ink outline-none focus:border-navy/40"/></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-mute">Return</span><input type="date" name="coverageEnd" className="h-10 rounded-lg border border-hair px-2.5 text-sm font-bold text-ink outline-none focus:border-navy/40"/></label>
              <span className="flex flex-col gap-1"><span className="text-xs font-bold text-mute">Traveller</span><span className="text-sm font-bold text-ink">{profile?.user.fullName} · from your SOUP profile</span></span>
              <button type="submit" className="ml-auto h-11 rounded-xl border-[1.5px] border-hair px-4 text-sm font-bold text-ink">Save trip details</button>
            </form>
          </section>
        )}

        <div role="note" className="mt-5 flex items-start gap-3 rounded-2xl border border-[#F1E2A8] bg-[#FFF8E1] p-[18px]">
          <CircleAlert size={22} className="mt-0.5 shrink-0 text-[#8A6A00]"/>
          <div className="flex flex-col gap-1 text-sm leading-relaxed">
            <strong>Before you buy</strong>
            <span className="text-[#4A3A00]">Pre-existing conditions (anything treated in the last 24 months, such as heart disease, diabetes or kidney disease) are not covered. Buy on or before your departure date — policies bought after you arrive are not valid. Read the policy wording first.</span>
          </div>
        </div>

        <p className="mt-5 text-sm text-mute">{policies.length} plan{policies.length === 1 ? "" : "s"} available through insuremart.</p>

        {policies.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy, index) => {
              const name = String(policy.name || "Insurance policy");
              return (
                <article key={index} className="flex flex-col gap-3.5 rounded-[20px] border border-hair bg-white p-[22px]">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#F1F2EE] text-sm font-extrabold text-ink">{initials(name)}</span>
                    <div className="min-w-0 flex-1"><span className="block text-base font-extrabold leading-snug">{name}</span></div>
                  </div>
                  {policy.description ? <p className="m-0 text-sm leading-relaxed text-mute">{String(policy.description)}</p> : null}
                  <div className="flex items-baseline gap-2.5 border-t border-[#EEF0EC] pt-3.5">
                    {policy.price ? <span className="text-xl font-extrabold text-ink">{String(policy.price)}</span> : <span className="text-sm text-mute">Price shown on insuremart</span>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {policy.url ? <a href={String(policy.url)} target="_blank" rel="noreferrer" className="ml-auto text-sm font-bold text-navy no-underline">Details</a> : <span className="ml-auto"/>}
                    <InsurancePartnerButton fallbackUrl={url} source={source} label="Buy now" className="flex h-[46px] items-center gap-1.5 rounded-xl bg-teal px-5 text-sm font-bold text-white disabled:opacity-60"/>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-hair bg-white p-6 text-sm leading-relaxed text-mute">insuremart&rsquo;s plan catalogue isn&rsquo;t loaded in this environment yet — use the button below to continue directly to insuremart for live quotes.</div>
        )}

        <p className="mt-6 text-[13px] leading-relaxed text-mute">Prices shown are from InsureMart&rsquo;s live catalogue. Policy availability, pricing, eligibility, underwriting and final policy terms are controlled by the insurer/marketplace — review the policy wording before purchase. SOUP does not issue the insurance policy itself.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <InsurancePartnerButton fallbackUrl={url} source={source}/>
          <Link href="/counselor?intent=insurance" className="rounded-full border border-hair px-4 py-2.5 text-xs font-semibold text-ink no-underline">Keep comparing with Noodles</Link>
        </div>
      </main>
    </div>
  );
}
