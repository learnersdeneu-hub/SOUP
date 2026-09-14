"use client";

import { ConversationWorkspace } from "@/components/conversation/ConversationWorkspace";

type Recommendation = { categoryLabel: string; description: string; delta: number | null; actionHref: string };

export function LearnConversation({ currentScore, potentialScore, completion, recommendations }: { currentScore: number | null; potentialScore: number | null; completion: number; recommendations: Recommendation[] }) {
  return (
    <ConversationWorkspace
      workflow="LEARN"
      signedIn
      title="Learn & Improve"
      subtitle="Ask GCI what to improve next. Advice is grounded in your saved profile, resume, evidence and goals."
      bottomAction={
        <div className="rounded-2xl border border-hair bg-white p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-paper p-3"><div className="text-[10px] text-mute">Current GCI</div><div className="mt-1 text-lg font-semibold text-ink">{currentScore === null ? "—" : currentScore.toFixed(1)}</div></div>
            <div className="rounded-xl bg-[#F0F7F5] p-3"><div className="text-[10px] text-teal">Potential*</div><div className="mt-1 text-lg font-semibold text-teal">{potentialScore === null ? "—" : potentialScore.toFixed(1)}</div></div>
            <div className="rounded-xl bg-paper p-3"><div className="text-[10px] text-mute">Profile</div><div className="mt-1 text-lg font-semibold text-ink">{completion}%</div></div>
          </div>
          {recommendations.length ? <div className="mt-3 space-y-2">{recommendations.slice(0, 3).map((item, index) => <a key={`${item.categoryLabel}-${index}`} href={item.actionHref} className="block rounded-xl border border-hair px-3 py-2"><div className="text-xs font-semibold text-ink">{item.description}</div><div className="mt-0.5 text-[10px] text-mute">{item.categoryLabel}{item.delta !== null ? ` · estimated +${item.delta.toFixed(1)}` : ""}</div></a>)}</div> : <p className="mt-3 text-xs text-mute">Keep talking to GCI about the direction you want to improve.</p>}
          <p className="mt-2 text-[9px] text-mute">*Potential is an internal improvement estimate from the current provisional scoring logic, not a guaranteed future score.</p>
        </div>
      }
    />
  );
}
