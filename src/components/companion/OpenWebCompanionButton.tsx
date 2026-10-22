"use client";

import { Globe } from "lucide-react";

// A second, overlapping window only makes sense when there's screen space
// for two things side by side — on a phone or narrow tablet there isn't, so
// below that width this just navigates in place (full screen, one thing at
// a time) instead of trying to spawn a desktop-style popup: mobile browsers
// either ignore window.open()'s width/height/left/top hints entirely or
// handle named popups inconsistently, and a "popup" that just becomes a
// full-screen tab anyway is a worse experience than an honest navigation.
//
// On a wide-enough screen, window.open() only ever controls the position/
// size of the NEW window it creates — it has no way to move or resize the
// browser window the student already has open with the application form
// in it. Docking this one to the top-right is the closest to "doesn't
// block anything" we can guarantee; avoiding a *specific* other window
// isn't something any website can do.
const NARROW_BREAKPOINT = 768;

function openCompanion() {
  if (window.innerWidth < NARROW_BREAKPOINT) {
    window.location.href = "/companion/web";
    return;
  }
  const width = 420;
  const height = 720;
  const left = Math.max(0, window.screen.availWidth - width - 24);
  const top = 24;
  const popup = window.open("/companion/web", "soup-companion", `width=${width},height=${height},left=${left},top=${top},resizable=yes,noopener`);
  // Popup blockers / some in-app browsers (and anything that otherwise
  // returns null) still leave the student with a working path.
  if (!popup) window.location.href = "/companion/web";
}

export function OpenWebCompanionButton({ className }: { className?: string }) {
  return (
    <button onClick={openCompanion} className={className || "inline-flex items-center gap-2 rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink"}>
      <Globe size={14} /> Open in your browser
    </button>
  );
}
