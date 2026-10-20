"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";
import type { ApplicationProgressSummary } from "@/lib/applications/progress";

const QUICK_PROMPTS: Array<[string, string]> = [
  ["Match me to universities", "Match me to universities that fit my budget, grades and goals"],
  ["What documents do I need?", "What documents do I need for my applications?"],
  ["How much will it cost?", "How much will studying abroad cost me, all in?"],
  ["Visa help", "What visa help can Noodles give me?"],
];

const JOURNEY_STEPS = ["Discover", "Apply", "Documents", "Visa & funds", "Arrive"] as const;

function journeyIndex(stage: string | null): number {
  switch (stage) {
    case "APPLYING": return 1;
    case "AWAITING_DECISIONS": return 2;
    case "OFFER_RECEIVED": return 3;
    case "VISA_PREPARATION": return 3;
    case "PRE_DEPARTURE": return 4;
    case "ARRIVED": return 4;
    default: return 0;
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The redesigned home hero (see the "SOUP Homepage Redesign" design
// canvas, Main.dc.html): a dark "Ask Noodles" card that routes into the
// real /counselor chat exactly like HomeAIEntry did, plus a signed-in-only
// "Your next step" card and journey stepper built from real dashboard data
// (src/lib/queries/dashboard.ts) rather than the mockup's placeholder copy.
export function HomeHero({
  signedIn,
  firstName,
  progress,
  nextTask,
  journeyStage,
}: {
  signedIn: boolean;
  firstName: string | null;
  progress: ApplicationProgressSummary | null;
  nextTask: { title: string; dueAt: Date | null } | null;
  journeyStage: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function ask(prompt: string) {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    router.push(`/counselor?prompt=${encodeURIComponent(prompt)}`);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  const activeIndex = journeyIndex(journeyStage);

  return (
    <>
      <section className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-[28px] bg-navy p-9 text-white">
          {signedIn && firstName && <p className="m-0 text-[15px] font-semibold text-[#B9C4DB]">{greeting()}, {firstName}</p>}
          <h1 className="m-0 text-[36px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">
            {signedIn ? <>Where do you want<br />to study next?</> : <>How can SOUP<br />help you today?</>}
          </h1>
          <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-[#D3DAEA]">Ask Noodles anything — or pick a starting point below. We&rsquo;ll guide you step by step.</p>
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2.5 rounded-[18px] bg-white py-2 pl-[18px] pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF4CC] text-[#8A6A00]"><NoodlesLoader size={18} active={submitting} /></span>
            <label htmlFor="home-ask" className="sr-only">Ask Noodles</label>
            <input
              id="home-ask"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. Cheapest business master's in Europe with a Jan intake"
              className="h-11 min-w-0 flex-1 border-0 bg-transparent font-sans text-base text-ink outline-none"
            />
            <button type="submit" disabled={!input.trim() || submitting} className="h-12 shrink-0 rounded-xl bg-teal px-[22px] text-[15px] font-bold text-white disabled:opacity-60">Ask Noodles</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(([label, prompt]) => (
              <button key={label} type="button" onClick={() => ask(prompt)} className="h-10 rounded-full border border-[#3A4A6E] bg-transparent px-4 text-sm font-semibold text-white">{label}</button>
            ))}
          </div>
        </div>

        {signedIn && (
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] rounded-[28px] border border-hair bg-white p-7">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-lg font-extrabold text-ink">Your next step</h2>
              {progress && <span className="rounded-lg bg-[#E8F4EF] px-2.5 py-1.5 text-[13px] font-bold text-teal">{progress.completedCount} of {progress.totalCount} done</span>}
            </div>
            {progress && <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF0EC]"><div className="h-full rounded-full bg-teal" style={{ width: `${progress.percent}%` }} /></div>}
            {nextTask ? (
              <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FFF8E1] p-[18px]">
                {nextTask.dueAt && <span className="text-xs font-bold uppercase tracking-wider text-[#7A5A00]">Due {nextTask.dueAt.toLocaleDateString()}</span>}
                <span className="text-[17px] font-bold text-ink">{nextTask.title}</span>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#F3F8F5] p-[18px] text-sm leading-relaxed text-mute">Nothing needs your attention right now — SOUP will surface the next step here.</div>
            )}
            <Link href="/pending" className="flex h-12 items-center justify-center rounded-xl bg-navy text-center text-[15px] font-bold text-white no-underline">Continue</Link>
            <Link href="/dashboard" className="text-center text-sm font-semibold text-navy no-underline">Open full dashboard</Link>
          </div>
        )}
      </section>

      {signedIn && (
        <section aria-labelledby="journey" className="mt-6 flex flex-col gap-[18px] rounded-3xl border border-hair bg-white p-7">
          <h2 id="journey" className="m-0 text-lg font-extrabold text-ink">Your study-abroad journey</h2>
          <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5">
            {JOURNEY_STEPS.map((label, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <li key={label} className={`flex flex-col gap-2 rounded-2xl p-3.5 ${active ? "border-2 border-navy bg-white" : done ? "bg-[#E8F4EF]" : "bg-paper"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${done ? "bg-teal text-white" : active ? "bg-navy text-white" : "bg-hair text-mute"}`}>{done ? <Check size={16} /> : index + 1}</span>
                  <span className="text-[15px] font-bold text-ink">{label}</span>
                  <span className="text-[13px] text-mute">{done ? "Done" : active ? "You are here" : "Up next"}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
