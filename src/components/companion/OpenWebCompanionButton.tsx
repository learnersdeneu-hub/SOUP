"use client";

import { Globe } from "lucide-react";

// window.open() only ever controls the position/size of the NEW window it
// creates — it has no way to move or resize the browser window the student
// already has open with the application form in it. Docking this one to
// the top-right of the screen is the closest to "doesn't block anything" we
// can guarantee; getting it to also avoid covering a specific other window
// isn't something any website can do.
function openPopup() {
  const width = 420;
  const height = 720;
  const left = Math.max(0, window.screen.availWidth - width - 24);
  const top = 24;
  window.open("/companion/web", "soup-companion", `width=${width},height=${height},left=${left},top=${top},resizable=yes,noopener`);
}

export function OpenWebCompanionButton({ className }: { className?: string }) {
  return (
    <button onClick={openPopup} className={className || "inline-flex items-center gap-2 rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink"}>
      <Globe size={14} /> Open in your browser
    </button>
  );
}
