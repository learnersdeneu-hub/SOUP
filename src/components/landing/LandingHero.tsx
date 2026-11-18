import type { ReactNode } from "react";
import { BedDouble, Check, GraduationCap, MessageCircle, PartyPopper, ShieldCheck } from "lucide-react";
import { SignInCard } from "@/components/auth/SignInCard";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";

// The sign-in card stays the centre of the page; the floating cards on either
// side are small, static previews of real SOUP screens (no live data — this
// page is shown before anyone is signed in).
function Floating({ children, className = "", delay = "0s" }: { children: ReactNode; className?: string; delay?: string }) {
  return (
    <div className={`landing-float rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_24px_50px_-24px_rgba(20,33,61,.35)] backdrop-blur ${className}`} style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}

function LeftCards() {
  return (
    <>
      <Floating className="w-[270px] -rotate-2" delay="0s">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F3FA8] text-xs font-extrabold text-white">KB</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-ink">KEDGE Business School</div>
            <div className="text-xs text-mute">France · Master in Management</div>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#E3F2E5] px-2.5 py-1 text-[11px] font-extrabold text-teal"><GraduationCap size={12} />Apply through SOUP</div>
      </Floating>
      <Floating className="mr-10 w-[290px] rotate-1" delay="1.2s">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF4CC] text-[#8A6A00]"><NoodlesLoader size={18} /></span>
          <div className="rounded-2xl rounded-tl-sm bg-[#F1F3EE] px-3 py-2 text-[13px] leading-snug text-ink">
            Found <b>6 programs</b> in Hungary, Greece &amp; Germany within your budget. Want me to compare them?
          </div>
        </div>
      </Floating>
      <Floating className="w-[250px] -rotate-1" delay="2.4s">
        <div className="flex items-center justify-between text-xs font-bold text-mute"><span>Visa checklist</span><span className="text-teal">8 / 10</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E4E7E1]"><div className="h-full w-4/5 rounded-full bg-teal" /></div>
        <ul className="mt-3 space-y-1.5 text-[12.5px] font-semibold text-ink">
          {["Passport & photos", "Admission letter", "Proof of funds"].map((item) => (
            <li key={item} className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-teal text-white"><Check size={11} strokeWidth={3.5} /></span>{item}</li>
          ))}
        </ul>
      </Floating>
    </>
  );
}

function RightCards() {
  return (
    <>
      <Floating className="w-[260px] rotate-2" delay="0.6s">
        <div className="flex items-center gap-2 text-xs font-bold text-[#B23C0B]"><PartyPopper size={14} />New offer</div>
        <div className="mt-1.5 text-sm font-extrabold text-ink">University of Debrecen</div>
        <div className="text-xs text-mute">BSc Business Administration · Sep intake</div>
      </Floating>
      <Floating className="ml-10 w-[270px] -rotate-1" delay="1.8s">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1E9FA] text-[#6A3FA0]"><ShieldCheck size={20} /></span>
          <div>
            <div className="text-sm font-extrabold text-ink">Student insurance</div>
            <div className="text-xs text-mute">Visa-ready · via insuremart</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-teal"><span className="h-1.5 w-1.5 rounded-full bg-teal" />Policy active</div>
      </Floating>
      <Floating className="w-[250px] rotate-1" delay="3s">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4CC] text-[#8A6A00]"><BedDouble size={20} /></span>
          <div>
            <div className="text-sm font-extrabold text-ink">Studio near campus</div>
            <div className="text-xs text-mute">8 min by tram · Verified</div>
          </div>
        </div>
      </Floating>
    </>
  );
}

export function LandingHero({ next, errorMessage, resetNotice }: { next: string; errorMessage?: string; resetNotice?: boolean }) {
  return (
    <section id="signin" className="relative scroll-mt-20 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="landing-blob absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#FFE27A]/50 blur-3xl" />
        <div className="landing-blob absolute -right-32 top-24 h-[480px] w-[480px] rounded-full bg-[#B9C8FF]/50 blur-3xl" style={{ animationDelay: "-6s" }} />
        <div className="landing-blob absolute bottom-[-200px] left-1/3 h-[460px] w-[460px] rounded-full bg-[#9FE3A8]/45 blur-3xl" style={{ animationDelay: "-12s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(#14213D14_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1fr_minmax(0,430px)_1fr] lg:pb-24">
        <div aria-hidden className="hidden flex-col items-end gap-6 lg:flex"><LeftCards /></div>

        <div className="flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-hair bg-white/80 px-3.5 py-1.5 text-xs font-bold text-mute backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5DBB46]" />Students Online University Portal
          </span>
          <p className="mt-4 text-center text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[44px]">
            Study abroad,{" "}
            <span className="bg-gradient-to-r from-[#1F3FA8] via-[#0B6B50] to-[#5DBB46] bg-clip-text text-transparent">sorted.</span>
          </p>
          <p className="mt-3 max-w-[380px] text-center text-[15px] leading-relaxed text-mute">
            Universities, applications, visa, housing and insurance — with an AI counselor by your side.
          </p>

          <div className="mt-7 w-full rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_40px_80px_-30px_rgba(20,33,61,.45)] ring-1 ring-ink/5 backdrop-blur-xl sm:p-8">
            <SignInCard next={next} errorMessage={errorMessage} resetNotice={resetNotice} />
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-center text-xs text-mute">
            <MessageCircle size={13} />New here? Request access — we&apos;ll email you once you&apos;re approved.
          </p>
        </div>

        <div aria-hidden className="hidden flex-col items-start gap-6 lg:flex"><RightCards /></div>
      </div>

      <div className="relative flex justify-center pb-8">
        <a href="#video" className="group flex flex-col items-center gap-1 text-xs font-bold text-mute no-underline">
          See SOUP in 15 seconds
          <span className="flex h-8 w-5 justify-center rounded-full border-2 border-mute/40 pt-1.5"><span className="h-1.5 w-1 animate-bounce rounded-full bg-mute/60" /></span>
        </a>
      </div>
    </section>
  );
}
