"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { MY_COLLEGES_CAP } from "@/lib/applications/lifecycle";

export type AddToMyCollegesProgram = { id: string; title: string; level: string; intake: string | null };
export type AddToMyCollegesSelection = { id: string; programId: string | null };

// The one shared "Add to My Colleges" control, used on both the /universities
// catalogue cards and the individual university page. Calls the exact same
// POST /api/applications the dashboard's Direct Application box and the
// university apply form already use — no separate "quick add" architecture,
// just another entry point into the one StudentApplication creation path.
// Removing reuses the existing withdraw endpoint (WithdrawApplicationButton's
// backend) with a fixed reason, since a casual "take this off my list" click
// doesn't need the same student-authored explanation a formal withdrawal
// from the full application page does.
export function AddToMyCollegesButton({
  universityId,
  universityName,
  programs,
  initialApplication,
  capReached,
  variant = "card",
}: {
  universityId: string;
  universityName: string;
  programs: AddToMyCollegesProgram[];
  initialApplication: AddToMyCollegesSelection | null;
  capReached: boolean;
  variant?: "card" | "primary";
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [added, setAdded] = useState<AddToMyCollegesSelection | null>(initialApplication);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function stop(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function addApplication(programId?: string) {
    setLoading(true);
    setPickerOpen(false);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId, programId: programId || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not add this university.");
      setAdded({ id: body.application.id, programId: body.application.programId || null });
      showToast(`Added ${universityName} to My Colleges.`, { actionLabel: "View My Colleges", actionHref: "/colleges" });
      router.refresh();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "Could not add this university.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function removeApplication() {
    if (!added) return;
    if (!window.confirm(`Remove ${universityName} from My Colleges? This won't delete any documents you've uploaded.`)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(added.id)}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Removed from My Colleges" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not remove this university.");
      setAdded(null);
      showToast(`Removed ${universityName} from My Colleges.`);
      router.refresh();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "Could not remove this university.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  function handleClick(event: MouseEvent) {
    stop(event);
    if (loading) return;
    if (added) { void removeApplication(); return; }
    if (capReached) return;
    if (programs.length > 1) { setPickerOpen((open) => !open); return; }
    void addApplication(programs[0]?.id);
  }

  const baseClass = variant === "primary"
    ? "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold"
    : "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold";
  const stateClass = added
    ? "border border-teal bg-[#F0F7F5] text-teal"
    : capReached
      ? "border border-hair bg-paper text-mute cursor-not-allowed"
      : "bg-navy text-white hover:bg-[#16314F]";

  return (
    <div ref={containerRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || (capReached && !added)}
        title={capReached && !added ? `You can track up to ${MY_COLLEGES_CAP} universities at a time. Remove one to add another.` : undefined}
        className={`${baseClass} ${stateClass} disabled:opacity-70`}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : added ? <Check size={13} /> : <Plus size={13} />}
        {loading ? "Working…" : added ? "In My Colleges" : capReached ? "My Colleges full" : "Add to My Colleges"}
        {!added && !capReached && programs.length > 1 && <ChevronDown size={12} />}
      </button>

      {pickerOpen && !added && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-hair bg-white p-1.5 shadow-[0_12px_32px_rgba(20,32,48,0.14)]" onClick={(event) => event.stopPropagation()}>
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Choose a program</div>
          {programs.map((program) => (
            <button
              key={program.id}
              type="button"
              onClick={(event) => { stop(event); void addApplication(program.id); }}
              className="block w-full rounded-lg px-2 py-2 text-left text-xs text-ink hover:bg-paper"
            >
              {program.title} — {program.level}{program.intake ? ` · ${program.intake}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
