"use client";

import { useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { saveWritingDraft } from "@/app/actions/applicationWriting";
import { countWords, MOTIVATION_LETTER_WORD_RANGE, PERSONAL_STATEMENT_WORD_RANGE } from "@/lib/applications/writingRequirement";
import type { WritingBoxDraft } from "@/lib/applications/coreProfile";
import { UploadBox } from "@/components/documents/UploadBox";
import type { CategoryDocument } from "@/lib/documents/categoryQuery";

const AUTOSAVE_DELAY_MS = 1500;

function WritingBox({
  boxType,
  title,
  helperText,
  draft,
  required,
  range,
  existing,
}: {
  boxType: "MOTIVATION_LETTER" | "PERSONAL_STATEMENT";
  title: string;
  helperText: string;
  draft: WritingBoxDraft;
  required: boolean;
  range: { min: number; max: number };
  existing: CategoryDocument[];
}) {
  const [text, setText] = useState(draft.text);
  const [wordCount, setWordCount] = useState(draft.wordCount);
  const [lastSavedAt, setLastSavedAt] = useState(draft.lastSavedAt);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("boxType", boxType);
      form.set("text", value);
      const result = await saveWritingDraft(form);
      if (result.ok) {
        setWordCount(result.wordCount);
        setLastSavedAt(result.lastSavedAt);
      }
    } finally {
      setSaving(false);
    }
  }, [boxType]);

  function handleChange(value: string) {
    setText(value);
    setWordCount(countWords(value));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), AUTOSAVE_DELAY_MS);
  }

  const outOfRange = wordCount > 0 && (wordCount < range.min || wordCount > range.max);

  return (
    <div className="rounded-xl border border-hair bg-paper p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{title}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-[.08em] ${required ? "text-[#B3261E]" : "text-mute"}`}>{required ? "Required" : "Optional"}</span>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-mute">{helperText}</p>
      <textarea value={text} onChange={(e) => handleChange(e.target.value)} rows={10} placeholder="Start writing…" className="mt-2 w-full rounded-xl border border-hair bg-white p-3 text-xs leading-6 text-ink outline-none focus:border-navy/40"/>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-mute">
        <span className={outOfRange ? "font-semibold text-[#9D3127]" : ""}>{wordCount} words{outOfRange ? ` (recommended ${range.min}–${range.max})` : ""}</span>
        <span className="flex items-center gap-1">
          {saving ? (<><Loader2 size={10} className="animate-spin"/>Saving…</>) : lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet"}
        </span>
      </div>
      <div className="mt-3">
        <UploadBox category={boxType} label="Upload as PDF/DOCX instead" required={false} multiple={false} existing={existing}/>
      </div>
    </div>
  );
}

export function WritingDraftForm({
  motivationLetter,
  personalStatement,
  motivationLetterRequired,
  personalStatementRequired,
  motivationLetterDocuments,
  personalStatementDocuments,
}: {
  motivationLetter: WritingBoxDraft;
  personalStatement: WritingBoxDraft;
  motivationLetterRequired: boolean;
  personalStatementRequired: boolean;
  motivationLetterDocuments: CategoryDocument[];
  personalStatementDocuments: CategoryDocument[];
}) {
  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Writing</h2>
        <p className="mt-1 text-xs leading-5 text-mute">Which box is required depends on the universities in My Colleges — Motivation Letter for Europe, Personal Statement for the US. This is your base draft, reused across every university; My Colleges lets you fine-tune a copy per application.</p>
      </div>
      <WritingBox
        boxType="MOTIVATION_LETTER"
        title="Motivation Letter"
        helperText="For European applications: explain why you want to study this program, at this university, and how it fits your goals."
        draft={motivationLetter}
        required={motivationLetterRequired}
        range={MOTIVATION_LETTER_WORD_RANGE}
        existing={motivationLetterDocuments}
      />
      <WritingBox
        boxType="PERSONAL_STATEMENT"
        title="Personal Statement"
        helperText="For US applications: tell your personal story — who you are, what you've overcome or achieved, and what you'll bring to campus."
        draft={personalStatement}
        required={personalStatementRequired}
        range={PERSONAL_STATEMENT_WORD_RANGE}
        existing={personalStatementDocuments}
      />
    </section>
  );
}
