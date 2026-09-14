"use client";

import { useState } from "react";

export function RenameDialog({
  initialTitle,
  onCancel,
  onSave,
}: {
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string) => void;
}) {
  const [value, setValue] = useState(initialTitle);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5"
      >
        <div className="text-sm font-semibold text-ink mb-3">Rename conversation</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave(value)}
          className="w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-medium rounded-xl py-2.5 border border-hair text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            className="flex-1 text-sm font-medium rounded-xl py-2.5 text-white bg-navy"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
