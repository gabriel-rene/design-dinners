"use client";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * Rail button that hides / shows the text over every image in the feed, so the
 * piece can be seen clean. Matches the "Compartir" rail button; while the text
 * is hidden the icon shows a crossed-out eye ("Mostrar" brings it back).
 */
export default function TextToggleButton({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={hidden ? "Mostrar texto" : "Ocultar texto"}
      aria-keyshortcuts="h"
      className="group flex flex-col items-center gap-1 text-dd-cream focus-visible:outline-none"
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-full transition-[transform,background-color,color] duration-200 group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-dd-yellow motion-reduce:transition-none ${
          hidden ? "bg-dd-cream text-dd-black" : "bg-black/40 backdrop-blur group-hover:bg-black/60"
        }`}
      >
        <EyeIcon off={hidden} />
      </span>
      <span aria-hidden className="text-xs font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
        {hidden ? "Mostrar" : "Ocultar"}
      </span>
    </button>
  );
}
