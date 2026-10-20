"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { assignRecommenderToApplication, unassignRecommenderFromApplication } from "@/app/actions/recommenders";

type RecommenderOption = { id: string; firstName: string; lastName: string };

// Lets a student assign which of their once-saved recommenders (see
// src/app/profile/extracurricular) cover a given university, instead of
// re-entering a recommender per application. requiresReferenceLetter drives
// the "fewer recommenders than required" warning from plan decision #7 — a
// binary check (any REFERENCE_LETTER-class checklist item + zero
// assignments), not a parsed count.
export function RecommenderAssignmentPanel({
  applicationId,
  allRecommenders,
  assignedRecommenderIds,
  requiresReferenceLetter,
}: {
  applicationId: string;
  allRecommenders: RecommenderOption[];
  assignedRecommenderIds: string[];
  requiresReferenceLetter: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const assignedSet = new Set(assignedRecommenderIds);

  async function toggle(recommenderId: string, assigned: boolean) {
    setBusyId(recommenderId);
    try {
      const form = new FormData();
      form.set("recommenderId", recommenderId);
      form.set("applicationId", applicationId);
      if (assigned) await unassignRecommenderFromApplication(form);
      else await assignRecommenderToApplication(form);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!allRecommenders.length) {
    if (!requiresReferenceLetter) return null;
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FFF3F0] p-3 text-[11px] leading-5 text-[#9D3127]">
        <TriangleAlert size={13} className="mt-0.5 shrink-0"/>
        <span>This university requires a recommendation letter, but you haven&apos;t added any recommenders yet. <Link href="/profile/extracurricular" className="font-semibold underline">Add one</Link>.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Recommenders for this university</div>
      {requiresReferenceLetter && assignedRecommenderIds.length === 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#FFF3F0] p-2.5 text-[11px] leading-5 text-[#9D3127]">
          <TriangleAlert size={13} className="mt-0.5 shrink-0"/>
          <span>This university requires a recommendation letter — assign at least one recommender below.</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {allRecommenders.map((recommender) => {
          const assigned = assignedSet.has(recommender.id);
          return (
            <button
              key={recommender.id}
              type="button"
              onClick={() => toggle(recommender.id, assigned)}
              disabled={busyId === recommender.id}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium disabled:opacity-60 ${assigned ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}
            >
              {recommender.firstName} {recommender.lastName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
