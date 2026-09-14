import Link from "next/link";
import { ArrowLeft, BadgeCheck, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { PartnerDirectoryButton } from "@/components/services/PartnerDirectoryButton";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { saveStudentServiceNeeds } from "@/app/actions/referrals";

type PartnerInventoryItem = {
  title?: unknown;
  name?: unknown;
  city?: unknown;
  area?: unknown;
  price?: unknown;
  availability?: unknown;
};

type PartnerPublicMetadata = { logoUrl?: unknown; inventory?: PartnerInventoryItem[] };

function partnerMetadata(value: unknown): PartnerPublicMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PartnerPublicMetadata : {};
}

export async function ServicePartnerDirectory({ type, title, intro, counselorIntent, source }: { type: "ACCOMMODATION" | "STUDENT_FINANCE" | "SCHOLARSHIP"; title: string; intro: string; counselorIntent: string; source?: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await prisma.profile.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  const [partners, studentCase, latestDestination] = await Promise.all([
    prisma.partner.findMany({ where: { type, status: "ACTIVE" }, orderBy: [{ internalPriority: "asc" }, { name: "asc" }], take: 100 }),
    profile ? prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { preferredCountries: true } }) : null,
    profile ? prisma.studentApplication.findFirst({ where: { profileId: profile.id, status: { in: ["OFFER_RECEIVED", "CONDITIONAL_OFFER", "ENROLLED"] } }, include: { university: { select: { country: true, city: true } } }, orderBy: { updatedAt: "desc" } }) : null,
  ]);
  const preferredCountries = Array.isArray(studentCase?.preferredCountries) ? studentCase!.preferredCountries.map((value) => String(value).toLowerCase()) : [];
  const destinationCountry = latestDestination?.university?.country?.toLowerCase() || null;
  const destinationCity = latestDestination?.university?.city?.toLowerCase() || null;
  const relevant = partners.filter((partner) => !partner.country || partner.country.toLowerCase() === destinationCountry || preferredCountries.includes(partner.country.toLowerCase()) || (destinationCity && partner.city?.toLowerCase() === destinationCity));
  const relevantIds = new Set(relevant.map((partner) => partner.id));
  const other = partners.filter((partner) => !relevantIds.has(partner.id));
  const orderedPartners = [...relevant, ...other];
  const attributionSource = source === "counselor" ? "COUNSELOR" : "SERVICE_DIRECTORY";
  const showConfirmedMcb = type === "STUDENT_FINANCE" && !partners.some((partner) => /MCB Islamic/i.test(partner.name));

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={Boolean(user)}/>
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Back to home</Link>
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP partner services</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">{intro}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Link href={`/counselor?intent=${counselorIntent}`} className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-white px-3 py-2 text-xs font-semibold text-navy"><MessageCircle size={12}/>Ask SOUP for guidance</Link><span className="text-[10px] text-mute">Partner options are shown directly below; chat is optional.</span></div>
        </div>
        {type === "ACCOMMODATION" && user ? <form action={saveStudentServiceNeeds.bind(null,"ACCOMMODATION")} className="mt-6 rounded-2xl border border-hair bg-white p-5"><div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">Your accommodation brief</div><h2 className="mt-1 text-sm font-semibold text-ink">Tell SOUP what to search for</h2><p className="mt-1 text-xs leading-5 text-mute">Save this once; Noodles, Concierge and the accommodation team can use the same brief instead of asking again.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><input name="city" placeholder="City / university area" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input name="budget" placeholder="Monthly budget + currency" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input type="date" name="moveIn" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><select name="roomType" className="rounded-xl border border-hair px-3 py-2.5 text-xs"><option value="">Room preference</option><option value="PRIVATE">Private room</option><option value="SHARED">Shared room</option><option value="STUDIO">Studio</option><option value="FLEXIBLE">Flexible</option></select><input name="commute" placeholder="Maximum commute, e.g. 30 minutes" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/><input name="notes" placeholder="Any must-haves or concerns" className="rounded-xl border border-hair px-3 py-2.5 text-xs"/></div><button className="mt-3 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Save accommodation brief</button></form> : null}
        <section className="mt-6 space-y-3">
          {partners.length === 0 && !showConfirmedMcb ? (
            <div className="rounded-2xl border border-hair bg-white p-6">
              <div className="text-sm font-semibold text-ink">No active online partner route is configured yet.</div>
              <p className="mt-2 text-xs leading-5 text-mute">The Noodles can still research and explain suitable independent options. SOUP will not pretend an external provider is a transactable SOUP partner.</p>
            </div>
          ) : orderedPartners.map((partner, index) => (
            <div key={partner.id} className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-start gap-3"><PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} logoUrl={String(partnerMetadata(partner.publicMetadata).logoUrl || "") || null}/><div><div className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal"/><div className="text-sm font-semibold text-ink">{partner.name}</div></div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-teal">{type === "ACCOMMODATION" ? "Accommodation Partner" : type === "STUDENT_FINANCE" ? "Finance / Banking Partner" : "SOUP Partner"}</div></div></div>
                  <div className="mt-1 text-xs text-mute">{[partner.city, partner.country].filter(Boolean).join(", ") || "SOUP Partner"}</div>
                  {relevantIds.has(partner.id) && <div className="mt-2 inline-flex rounded-full bg-[#F0F7F5] px-2.5 py-1 text-[10px] font-semibold text-teal">Relevant to your saved journey</div>}
                  {index === relevant.length && relevant.length > 0 && other.length > 0 ? <div className="mt-3 text-[10px] font-semibold uppercase tracking-[.12em] text-mute">Other active SOUP partner option</div> : null}
                  <p className="mt-3 text-xs leading-5 text-mute">This is active SOUP partner inventory. Eligibility, availability, pricing and final provider terms remain controlled by the provider.</p>
                  {type === "ACCOMMODATION" && Array.isArray(partnerMetadata(partner.publicMetadata).inventory) && partnerMetadata(partner.publicMetadata).inventory!.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {partnerMetadata(partner.publicMetadata).inventory!.slice(0, 6).map((item, itemIndex) => (
                        <div key={`${partner.id}-${itemIndex}`} className="rounded-xl bg-paper p-3">
                          <div className="text-xs font-semibold text-ink">{String(item.title || item.name || "Accommodation option")}</div>
                          <div className="mt-1 text-[11px] text-mute">{[item.city, item.area].filter(Boolean).join(" · ") || "Partner listing"}</div>
                          {item.price ? <div className="mt-2 text-[11px] font-semibold text-navy">{String(item.price)}</div> : null}
                          {item.availability ? <div className="mt-1 text-[10px] text-teal">{String(item.availability)}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {partner.transactionUrl || partner.websiteUrl
                  ? <PartnerDirectoryButton partnerId={partner.id} label="Continue with partner" source={attributionSource}/>
                  : <div className="rounded-full border border-hair px-3 py-2 text-xs font-semibold text-mute">Online route pending</div>}
              </div>
            </div>
          ))}
          {showConfirmedMcb && <div className="rounded-2xl border border-hair bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-start gap-3"><PartnerLogo name="MCB Islamic Bank" websiteUrl="https://www.mcbislamicbank.com/"/><div><div className="flex items-center gap-2"><BadgeCheck size={15} className="text-teal"/><div className="text-sm font-semibold text-ink">MCB Islamic Bank</div></div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-teal">Banking Partner</div></div></div><div className="mt-1 text-xs text-mute">Pakistan</div><p className="mt-3 text-xs leading-5 text-mute">MCB Islamic Bank is SOUP's confirmed banking partner. Product eligibility, pricing, account opening and final banking terms remain controlled by the bank.</p></div><a href="https://www.mcbislamicbank.com/" target="_blank" rel="noreferrer" className="rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white">View banking partner</a></div></div>}
        </section>
        <div className="mt-5 rounded-2xl border border-hair bg-white p-4 text-xs leading-5 text-mute">The Counselor may recommend suitable non-partner options too, but those are advisory only and must be handled externally.</div>
      </main>
    </div>
  );
}
