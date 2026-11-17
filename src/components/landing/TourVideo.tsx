"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// 15-second product tour (rendered from scripts/landing-video/tour.html).
// Autoplays muted and looped like a hero loop, except for visitors who prefer
// reduced motion — they get the poster and a play button instead.
export function TourVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.play().catch(() => {});
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 rounded-[44px] bg-gradient-to-br from-[#FFE27A] via-[#9FE3A8] to-[#B9C8FF] opacity-70 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-2 shadow-[0_50px_100px_-40px_rgba(20,33,61,.55)] sm:rounded-[36px] sm:p-3">
        <video
          ref={ref}
          className="block aspect-video w-full rounded-[20px] bg-paper sm:rounded-[26px]"
          src="/landing/soup-tour.mp4"
          poster="/landing/soup-tour-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="A 15-second tour of SOUP: finding universities, asking the Noodles AI counselor, and sorting applications, housing and insurance"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-4 right-4 flex h-9 items-center gap-2 rounded-full bg-ink/85 px-3 sm:h-11 sm:px-4 text-xs font-bold text-white backdrop-blur transition hover:bg-ink sm:bottom-7 sm:right-7"
          aria-label={playing ? "Pause video" : "Play video"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          <span className="hidden sm:inline">{playing ? "Pause" : "Play tour"}</span>
        </button>
      </div>
    </div>
  );
}
