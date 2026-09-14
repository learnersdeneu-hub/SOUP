"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Coins, Search } from "lucide-react";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { CHANNEL_LABELS, type CatalogChannel } from "@/lib/universities/catalogChannels";

export type CatalogUniversity = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  channel: CatalogChannel;
  programCount: number;
  feeRange: string | null;
  intakes: string[];
  levels: string[];
  fields: string[];
};

const PAGE_SIZE = 30;
const SELECTABLE_LEVELS = ["Bachelors", "Masters"];

export function UniversityCatalogBrowser({ universities }: { universities: CatalogUniversity[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<CatalogChannel | "ALL">("ALL");
  const [country, setCountry] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [field, setField] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const availableChannels = useMemo(() => {
    const present = new Set(universities.map((u) => u.channel));
    return (Object.keys(CHANNEL_LABELS) as CatalogChannel[]).filter((c) => present.has(c));
  }, [universities]);

  const availableCountries = useMemo(
    () => [...new Set(universities.map((u) => u.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [universities],
  );

  const availableLevels = useMemo(() => {
    const present = new Set(universities.flatMap((u) => u.levels));
    return SELECTABLE_LEVELS.filter((l) => present.has(l));
  }, [universities]);

  const availableFields = useMemo(
    () => [...new Set(universities.flatMap((u) => u.fields))].sort((a, b) => a.localeCompare(b)),
    [universities],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = universities.filter((u) => {
      if (channel !== "ALL" && u.channel !== channel) return false;
      if (country !== "ALL" && u.country !== country) return false;
      // A university with no verified program rows at all has an empty
      // levels/fields array — that means "unknown", not "does not offer
      // this", so it stays visible under a level/subject filter rather than
      // being silently hidden for lack of data (the fee/intake cards already
      // point the student to Noodles to verify in that same situation).
      if (level !== "ALL" && u.levels.length > 0 && !u.levels.includes(level)) return false;
      if (field !== "ALL" && u.fields.length > 0 && !u.fields.includes(field)) return false;
      if (!needle) return true;
      return u.name.toLowerCase().includes(needle) || u.country.toLowerCase().includes(needle) || (u.city || "").toLowerCase().includes(needle);
    });
    const hasLogo = (u: CatalogUniversity) => Boolean(u.logoUrl || u.websiteUrl);
    return matches
      .map((u, index) => ({ u, index }))
      .sort((a, b) => {
        const rank = Number(hasLogo(b.u)) - Number(hasLogo(a.u));
        return rank !== 0 ? rank : a.index - b.index;
      })
      .map(({ u }) => u);
  }, [universities, query, channel, country, level, field]);

  const visible = filtered.slice(0, visibleCount);
  const filtersActive = query || channel !== "ALL" || country !== "ALL" || level !== "ALL" || field !== "ALL";

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  function openInNoodles(university: CatalogUniversity) {
    const params = new URLSearchParams({ intent: "universities", universityId: university.id, prompt: "I'd like to apply to this university." });
    router.push(`/counselor?${params.toString()}`);
  }

  const selectClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-navy/40";

  return (
    <div>
      <div className="rounded-2xl border border-hair bg-white p-4 sm:p-5">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder="Search by university, city or country..."
            className="w-full rounded-full border border-hair bg-white py-2.5 pl-9 pr-4 text-sm text-ink outline-none focus:border-navy/40"
          />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={country} onChange={(event) => { setCountry(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by country">
            <option value="ALL">All countries</option>
            {availableCountries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={level} onChange={(event) => { setLevel(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by degree level">
            <option value="ALL">All degree levels</option>
            {availableLevels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={field} onChange={(event) => { setField(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by subject">
            <option value="ALL">All subjects</option>
            {availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => { setChannel("ALL"); resetPage(); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${channel === "ALL" ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/30"}`}>
            All ({universities.length})
          </button>
          {availableChannels.map((c) => (
            <button key={c} onClick={() => { setChannel(c); resetPage(); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${channel === c ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink hover:border-navy/30"}`}>
              {CHANNEL_LABELS[c]} ({universities.filter((u) => u.channel === c).length})
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-mute">{filtered.length} of {universities.length} universities{filtersActive ? " match your filters" : " in the SOUP catalogue"}.</p>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((university) => (
          <button
            key={university.id}
            onClick={() => openInNoodles(university)}
            className="group min-w-0 rounded-2xl border border-hair bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm"
          >
            <div className="flex min-w-0 items-start gap-3">
              <PartnerLogo name={university.name} websiteUrl={university.websiteUrl} logoUrl={university.logoUrl} />
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold text-ink">{university.name}</div>
                <div className="mt-1 text-xs text-mute">{[university.city, university.country].filter(Boolean).join(", ")}</div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[.12em] text-teal">{CHANNEL_LABELS[university.channel]}</div>
              </div>
              <ArrowRight size={14} className="mt-1 shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-navy" />
            </div>
            <div className="mt-4 grid gap-2 border-t border-hair pt-3 text-[10px] sm:grid-cols-2">
              <div className="min-w-0"><div className="flex items-center gap-1 font-semibold text-ink"><Coins size={11} />Fees</div><div className="mt-1 break-words leading-4 text-mute">{university.feeRange || "Ask Noodles to verify"}</div></div>
              <div className="min-w-0"><div className="flex items-center gap-1 font-semibold text-ink"><CalendarDays size={11} />Intakes</div><div className="mt-1 break-words leading-4 text-mute">{university.intakes.length ? university.intakes.join(" · ") : "Ask Noodles to verify"}</div></div>
            </div>
          </button>
        ))}
      </section>

      {!filtered.length ? (
        <div className="mt-8 rounded-2xl border border-hair bg-white p-6 text-sm text-mute">No universities match that search.</div>
      ) : visibleCount < filtered.length ? (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full border border-hair bg-white px-5 py-2.5 text-xs font-semibold text-ink hover:border-navy/30">
            Show more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}
