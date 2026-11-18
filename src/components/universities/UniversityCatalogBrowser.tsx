"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Coins, Search, X } from "lucide-react";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { CHANNEL_LABELS, type CatalogChannel } from "@/lib/universities/catalogChannels";
import { AddToMyCollegesButton, type AddToMyCollegesProgram, type AddToMyCollegesSelection } from "@/components/applications/AddToMyCollegesButton";

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
  minTuition: number | null;
  intakes: string[];
  levels: string[];
  fields: string[];
  languages: string[];
  programs: AddToMyCollegesProgram[];
  mySelection: AddToMyCollegesSelection | null;
};

const PAGE_SIZE = 30;
// Preferred display order for degree levels commonly present in the catalog;
// any level not listed here (e.g. a data-entry variant) still appears,
// sorted alphabetically after the known ones, rather than being hidden.
const LEVEL_ORDER = ["Foundation", "Diploma", "Bachelors", "Masters", "MBA", "PhD"];

// Coarse fee brackets, not currency-converted (see minTuition's own comment
// in src/app/universities/page.tsx) — a discovery filter, not a precise
// cross-currency comparison tool.
const FEE_BUCKETS = [
  { value: "FREE", label: "Tuition-free", test: (n: number) => n === 0 },
  { value: "UNDER_10K", label: "Under 10,000 / year", test: (n: number) => n > 0 && n < 10000 },
  { value: "10K_25K", label: "10,000 – 25,000 / year", test: (n: number) => n >= 10000 && n <= 25000 },
  { value: "OVER_25K", label: "25,000+ / year", test: (n: number) => n > 25000 },
] as const;
type FeeBucket = (typeof FEE_BUCKETS)[number]["value"] | "ALL";

export function UniversityCatalogBrowser({ universities, signedIn, capReached, initialChannel, initialQuery }: { universities: CatalogUniversity[]; signedIn: boolean; capReached: boolean; initialChannel?: CatalogChannel; initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery || "");
  const [channel, setChannel] = useState<CatalogChannel | "ALL">(initialChannel && initialChannel in CHANNEL_LABELS ? initialChannel : "ALL");
  const [country, setCountry] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [field, setField] = useState("ALL");
  const [intake, setIntake] = useState("ALL");
  const [language, setLanguage] = useState("ALL");
  const [feeBucket, setFeeBucket] = useState<FeeBucket>("ALL");
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
    const present = [...new Set(universities.flatMap((u) => u.levels))];
    return present.sort((a, b) => {
      const ai = LEVEL_ORDER.indexOf(a);
      const bi = LEVEL_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [universities]);

  const availableFields = useMemo(
    () => [...new Set(universities.flatMap((u) => u.fields))].sort((a, b) => a.localeCompare(b)),
    [universities],
  );

  const availableIntakes = useMemo(
    () => [...new Set(universities.flatMap((u) => u.intakes))].sort((a, b) => a.localeCompare(b)),
    [universities],
  );

  // Language is only worth offering as a filter when at least some catalog
  // programs actually record it — otherwise the control would always be a
  // no-op "All languages" dropdown with nothing to select.
  const availableLanguages = useMemo(
    () => [...new Set(universities.flatMap((u) => u.languages))].sort((a, b) => a.localeCompare(b)),
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
      if (intake !== "ALL" && u.intakes.length > 0 && !u.intakes.includes(intake)) return false;
      if (language !== "ALL" && u.languages.length > 0 && !u.languages.includes(language)) return false;
      // Same "unknown stays visible" rule as level/field/intake above — no
      // recorded tuition means unverified, not necessarily out of range.
      if (feeBucket !== "ALL" && u.minTuition != null) {
        const bucket = FEE_BUCKETS.find((b) => b.value === feeBucket);
        if (bucket && !bucket.test(u.minTuition)) return false;
      }
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
  }, [universities, query, channel, country, level, field, intake, language, feeBucket]);

  const visible = filtered.slice(0, visibleCount);
  const filtersActive = query || channel !== "ALL" || country !== "ALL" || level !== "ALL" || field !== "ALL" || intake !== "ALL" || language !== "ALL" || feeBucket !== "ALL";

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  // A student who picks several dropdown filters plus a typed phrase can
  // easily land on a combination nothing matches (the search box only
  // matches university/city/country text, not a free-form description) —
  // with no visible way back to the full list, that reads as "the catalog
  // is broken" rather than "these specific filters are too narrow."
  function clearAllFilters() {
    setQuery("");
    setChannel("ALL");
    setCountry("ALL");
    setLevel("ALL");
    setField("ALL");
    setIntake("ALL");
    setLanguage("ALL");
    setFeeBucket("ALL");
    resetPage();
  }

  // Goes to the university's own summary page (fees, intakes, levels,
  // program list) rather than straight into Noodles — a student clicking a
  // catalogue card wants to see what the university actually offers first.
  // That page's own "Ask Noodles about this university" button is still the
  // high-intent entry into Noodles, with the same university context passed.
  function openUniversity(university: CatalogUniversity) {
    router.push(`/universities/${university.id}`);
  }

  const selectClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-navy/40";

  return (
    <div>
      <div className="rounded-2xl border-[1.5px] border-[#C7D4F0] bg-white p-4 shadow-[0_2px_12px_rgba(31,63,168,0.06)] sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E9EEFB]"><Search size={13} className="text-[#1F3FA8]" /></span>
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#1F3FA8]">Search &amp; filters</span>
        </div>
        <form
          role="search"
          onSubmit={(event) => { event.preventDefault(); resetPage(); (event.currentTarget.elements.namedItem("catalog-search") as HTMLInputElement | null)?.blur(); }}
          className="relative"
        >
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            name="catalog-search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder="Search by university, city or country..."
            className="w-full rounded-full border border-hair bg-white py-2.5 pl-9 pr-20 text-sm text-ink outline-none focus:border-navy/40"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => { setQuery(""); resetPage(); }}
              className="absolute right-11 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-mute hover:bg-paper hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            title="Search"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-navy text-white hover:bg-[#16314F]"
          >
            <Search size={13} />
          </button>
        </form>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select value={country} onChange={(event) => { setCountry(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by country (location)">
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
          <select value={intake} onChange={(event) => { setIntake(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by intake">
            <option value="ALL">All intakes</option>
            {availableIntakes.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          {availableLanguages.length > 0 && (
            <select value={language} onChange={(event) => { setLanguage(event.target.value); resetPage(); }} className={selectClass} aria-label="Filter by language of instruction">
              <option value="ALL">All languages</option>
              {availableLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <select value={feeBucket} onChange={(event) => { setFeeBucket(event.target.value as FeeBucket); resetPage(); }} className={selectClass} aria-label="Filter by tuition fee range">
            <option value="ALL">All tuition fees</option>
            {FEE_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
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
          <div
            key={university.id}
            role="button"
            tabIndex={0}
            onClick={() => openUniversity(university)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openUniversity(university); } }}
            className="group min-w-0 cursor-pointer rounded-2xl border border-hair bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm"
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
            {signedIn ? (
              <AddToMyCollegesButton
                universityId={university.id}
                universityName={university.name}
                programs={university.programs}
                initialApplication={university.mySelection}
                capReached={capReached}
              />
            ) : (
              <a href={`/sign-up?next=${encodeURIComponent("/universities")}`} onClick={(event) => event.stopPropagation()} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-hair px-3 py-2.5 text-xs font-semibold text-ink hover:border-navy/30">Sign in to add to My Colleges</a>
            )}
          </div>
        ))}
      </section>

      {!filtered.length ? (
        <div className="mt-8 rounded-2xl border border-hair bg-white p-6 text-center text-sm text-mute">
          <p className="m-0">No universities match that search.</p>
          {filtersActive && (
            <button onClick={clearAllFilters} className="mt-3 inline-flex rounded-full border border-hair bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy/30">
              Clear search &amp; filters
            </button>
          )}
        </div>
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
