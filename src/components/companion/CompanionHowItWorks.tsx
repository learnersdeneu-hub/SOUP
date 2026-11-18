import { KeyRound, ScanLine, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: KeyRound,
    bg: "#FFF4CC",
    fg: "#8A6A00",
    title: "Connect your account",
    body: "Generate a one-time code here and enter it in the app, or sign in on the web — either way, Companion only ever sees what your SOUP profile already holds.",
  },
  {
    icon: ScanLine,
    bg: "#E9EEFB",
    fg: "#1F3FA8",
    title: "Open a real application form",
    body: "UCAS, Common App, a visa portal, anything — Companion scans the page and works out which fields it can already answer.",
  },
  {
    icon: Sparkles,
    bg: "#E8F4EF",
    fg: "#0B6B50",
    title: "It fills, narrates, and asks when unsure",
    body: "Every fill is shown before it happens. If something's ambiguous — like two uploaded English test reports — it stops and asks which one to use, instead of guessing.",
  },
] as const;

export function CompanionHowItWorks() {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">How it works</div>
      <div className="relative mt-5 flex flex-col gap-6">
        <div aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-hair" />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative flex gap-4">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: step.bg }}>
                <Icon size={18} style={{ color: step.fg }} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">{index + 1}</span>
              </span>
              <div className="pt-1">
                <div className="text-sm font-bold text-ink">{step.title}</div>
                <p className="mt-1 text-[12.5px] leading-5 text-mute">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* A small, honest preview of the actual product — the same mockup
          style as the homepage banner — so this reads as "here's what it
          looks like" rather than a wall of promises. */}
      <div className="mt-7 overflow-hidden rounded-2xl bg-[#0E1830] p-5">
        <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-1.5 bg-[#1A2B4D] px-2.5 py-2">
            <span className="rounded-t-md bg-paper px-2.5 py-1 text-[9px] font-bold text-ink">UCAS — Apply</span>
            <span className="rounded-t-md bg-white/10 px-2 py-1 text-[9px] font-semibold text-[#B9C4DB]">SOUP</span>
          </div>
          <div className="flex gap-1.5 bg-[#1A2B4D] px-2.5 pb-2 pt-1.5">
            <span className="h-4 w-4 rounded-md bg-white/10" />
            <span className="h-4 w-4 rounded-md bg-white/10" />
            <span className="h-4 flex-1 rounded-lg bg-white" />
          </div>
          <div className="flex">
            <div className="flex-1 space-y-2 p-3.5">
              <span className="block h-[7px] w-3/5 rounded bg-hair" />
              <span className="block h-5 w-11/12 rounded-md border border-[#C8E2D6] bg-[#F3F8F5]" />
              <span className="mt-1 block h-[7px] w-2/5 rounded bg-hair" />
              <span className="block h-5 w-11/12 rounded-md border border-[#C8E2D6] bg-[#F3F8F5]" />
              <span className="mt-1 block h-[7px] w-1/2 rounded bg-hair" />
              <span className="block h-5 w-11/12 rounded-md border border-[#F1C564] bg-[#FFFBEF]" />
            </div>
            <div className="flex w-[108px] shrink-0 flex-col gap-1.5 border-l border-hair bg-white p-2.5">
              <span className="h-5 w-5 rounded-md bg-[#FFF4CC]" />
              <span className="h-[30px] w-full rounded-lg bg-paper" />
              <span className="h-10 w-full rounded-lg bg-[#FFF8E1]" />
              <span className="mt-auto h-5 w-full rounded-lg bg-teal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
