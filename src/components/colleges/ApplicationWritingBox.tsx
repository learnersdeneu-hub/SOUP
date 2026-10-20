"use client";

import { useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { saveApplicationWritingOverride } from "@/app/actions/applicationWriting";
import { countWords } from "@/lib/applications/writingRequirement";
import { UploadBox } from "@/components/documents/UploadBox";
import type { CategoryDocument } from "@/lib/documents/categoryQuery";

const AUTOSAVE_DELAY_MS = 1500;

// Per-university editable copy of a Motivation Letter / Personal Statement
// base draft (see WritingDraftForm on src/app/profile/extracurricular).
// initialText is pre-filled by the caller from the base draft when no
// ApplicationWritingOverride row exists yet — this component never reads
// or mutates the base draft itself, only ApplicationWritingOverride.
export function ApplicationWritingBox({
  applicationId,
  boxType,
  title,
  range,
  initialText,
  initialLastSavedAt,
  existing,
}: {
  applicationId: string;
  boxType: "MOTIVATION_LETTER" | "PERSONAL_STATEMENT";
  title: string;
  range: { min: number; max: number };
  initialText: string;
  initialLastSavedAt: string | null;
  existing: CategoryDocument[];
}) {
  const [text, setText] = useState(initialText);
  const [wordCount, setWordCount] = useState(countWords(initialText));
  const [lastSavedAt, setLastSavedAt] = useState(initialLastSavedAt);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("applicationId", applicationId);
      form.set("boxType", boxType);
      form.set("text", value);
      const result = await saveApplicationWritingOverride(form);
      if (result.ok) {
        setWordCount(result.wordCount);
        setLastSavedAt(result.lastSavedAt);
      }
    } finally {
      setSaving(false);
    }
  }, [applicationId, boxType]);

  function handleChange(value: string) {
    setText(value);
    setWordCount(countWords(value));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), AUTOSAVE_DELAY_MS);
  }

  const outOfRange = wordCount > 0 && (wordCount < range.min || wordCount > range.max);

  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">{title} for this university</div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        placeholder="Pre-filled from your base draft — edit freely, this copy is specific to this university."
        className="mt-2 w-full rounded-xl border border-hair bg-white p-3 text-xs leading-6 text-ink outline-none focus:border-navy/40"
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-mute">
        <span className={outOfRange ? "font-semibold text-[#9D3127]" : ""}>{wordCount} words{outOfRange ? ` (recommended ${range.min}–${range.max})` : ""}</span>
        <span className="flex items-center gap-1">
          {saving ? (<><Loader2 size={10} className="animate-spin"/>Saving…</>) : lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet"}
        </span>
      </div>
      <div className="mt-2">
        <UploadBox category={boxType} label="Upload as PDF/DOCX instead" required={false} multiple={false} existing={existing} extraFormFields={{ applicationId, boxType }}/>
      </div>
    </div>
  );
}
