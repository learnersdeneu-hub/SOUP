import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { InsurancePartnerButton } from "@/components/services/InsurancePartnerButton";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { saveStudentServiceNeeds } from "@/app/actions/referrals";

export default async function InsuranceServicePage({ searchParams }: { searchParams: { source?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const partner = await prisma.partner.findFirst({ where: { type: "INSURANCE", status: "ACTIVE", slug: "hellenic-sun-insuremart" }, orderBy: { internalPriority: "asc" } });
  const url = partner?.transactionUrl || "https://insuremart.pk/";

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/counselor?intent=insurance" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/> Back to Counselor</Link>
        <section className="mt-5 rounded-3xl border border-hair bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3"><PartnerLogo name={partner?.name || "Hellenic Sun Insurance Brokers / insuremart"} websiteUrl={partner?.websiteUrl || url} size={48}/><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7F5] text-teal"><ShieldCheck size={18}/></div></div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-teal">SOUP insurance purchase channel</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Continue with insuremart</h1>
          <p className="mt-3 text-sm leading-6 text-mute">Noodles can discuss insurance options across the wider market. When you choose to purchase insurance through SOUP, the transaction continues through our active insurance marketplace partner channel operated by Hellenic Sun Insurance Brokers.</p>
          {user ? <form action={saveStudentServiceNeeds.bind(null,"INSURANCE")} className="mt-6 rounded-2xl border border-hair p-5"><div className="text-sm font-semibold text-ink">Save your insurance brief</div><p className="mt-1 text-xs leading-5 text-mute">SOUP will reuse these details when Noodles or a human counselor helps compare cover.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><input name="destination" placeholder="Destination country" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input name="visaType" placeholder="Visa / study purpose" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input type="date" name="coverageStart" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input type="date" name="coverageEnd" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input name="notes" placeholder="Coverage needs / concerns" className="rounded-xl border border-hair px-3 py-2.5 text-xs sm:col-span-2"/></div><button className="mt-3 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Save insurance brief</button></form> : null}
          <div className="mt-6 rounded-2xl bg-[#F7F8FA] p-5">
            <div className="text-sm font-semibold text-ink">Before you continue</div>
            <p className="mt-2 text-xs leading-5 text-mute">Policy availability, pricing, eligibility, underwriting and final policy terms are controlled by the insurer/marketplace. Review the policy wording before purchase. SOUP does not issue the insurance policy itself.</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <InsurancePartnerButton fallbackUrl={url} source={searchParams.source === "counselor" ? "COUNSELOR" : "INSURANCE_PAGE"}/>
            <Link href="/counselor?intent=insurance" className="rounded-full border border-hair px-4 py-2.5 text-xs font-semibold text-ink">Keep comparing with Noodles</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
