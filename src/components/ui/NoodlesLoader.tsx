export function NoodlesLoader({ size = 20, className = "", active = true }: { size?: number; className?: string; active?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Noodles is thinking"
    >
      {active && (
        <>
          <path d="M9 8 Q8.3 5.5 9 2.5" className="soup-steam" opacity={0.8} />
          <path d="M15 8 Q15.7 5.5 15 2.5" className="soup-steam soup-steam-delay" opacity={0.8} />
        </>
      )}
      <path d="M7.5 11 Q8 8.8 9.3 9.8" opacity={0.75} />
      <path d="M11 11 Q11.3 8.3 12.7 9.6" opacity={0.75} />
      <path d="M14.7 11 Q15.3 8.8 16.5 9.9" opacity={0.75} />
      <path d="M4.5 13.2 L6.5 19 Q12 21.8 17.5 19 L19.5 13.2" />
      <ellipse cx="12" cy="13.1" rx="7.5" ry="1.6" />
      <circle cx="9.4" cy="15.6" r="0.95" fill="currentColor" stroke="none" className={active ? "soup-blink" : undefined} />
      <circle cx="14.6" cy="15.6" r="0.95" fill="currentColor" stroke="none" className={active ? "soup-blink" : undefined} />
      <path d="M9.7 17.9 Q12 19.3 14.3 17.9" />
      {active && (
        <style>{`
          @keyframes soup-steam-rise { 0% { transform: translateY(3px); opacity: 0; } 35% { opacity: .85; } 100% { transform: translateY(-3px); opacity: 0; } }
          @keyframes soup-blink { 0%, 88%, 100% { transform: scaleY(1); } 92% { transform: scaleY(0.15); } }
          .soup-steam { animation: soup-steam-rise 1.7s ease-in-out infinite; transform-origin: center bottom; }
          .soup-steam-delay { animation-delay: .6s; }
          .soup-blink { animation: soup-blink 2.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        `}</style>
      )}
    </svg>
  );
}
