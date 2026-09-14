"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";

export function HomeAIEntry({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || submitting) return;
    setSubmitting(true);
    router.push(`/counselor?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <form onSubmit={submit} className={`w-full rounded-[28px] border border-hair bg-white shadow-[0_14px_45px_rgba(20,32,48,0.08)] ${compact ? "p-4" : "p-5 sm:p-7"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF0F5] text-navy"><NoodlesLoader size={17} active={false}/></div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Ask Noodles</div>
          {!compact && <p className="mt-1 text-xs leading-5 text-mute">Start anywhere — universities, applications, documents, visas, accommodation, insurance or student finance. Your first message continues directly with Noodles.</p>}
          {compact && <p className="mt-1 text-xs leading-5 text-mute">Not sure which university fits? Ask here.</p>}
        </div>
      </div>
      <div className={`flex items-end gap-2 rounded-2xl border border-hair bg-paper p-2 ${compact ? "mt-3" : "mt-5"}`}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event as unknown as FormEvent); } }}
          rows={compact ? 1 : 2}
          placeholder="Tell Noodles what you need help with..."
          className={`flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-ink outline-none ${compact ? "min-h-[36px]" : "min-h-[58px]"}`}
        />
        <button type="submit" disabled={!input.trim() || submitting} className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white disabled:bg-[#D8DDE2]" aria-label="Ask Noodles">{submitting ? <NoodlesLoader size={16} className="text-white"/> : <ArrowUp size={16}/>}</button>
      </div>
    </form>
  );
}
