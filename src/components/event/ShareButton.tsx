"use client";

import { useState } from "react";

function ShareIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}

/**
 * Shares `url` with the Web Share API, falling back to copying it. `url` may be
 * relative (La Vitrina passes `/vitrina/{id}`); it is resolved against the page.
 */
export default function ShareButton({
  url,
  title,
  variant = "pill",
}: {
  url: string;
  title: string;
  /** "pill": outlined button (event page). "rail": round icon + caption over a dark image (La Vitrina). */
  variant?: "pill" | "rail";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const absolute = new URL(url, window.location.href).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch (error) {
        // The visitor closed the share sheet: nothing else to do.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Blocked or unsupported: fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copia este enlace:", absolute);
    }
  }

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={share}
        className="group flex flex-col items-center gap-1 text-dd-cream focus-visible:outline-none"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur transition-[transform,background-color] duration-200 group-hover:bg-black/60 group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-dd-yellow motion-reduce:transition-none">
          <ShareIcon size={22} />
        </span>
        <span aria-live="polite" className="text-xs font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
          {copied ? "¡Copiado!" : "Compartir"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-2 border-dd-black px-4 text-sm font-bold dd-btn md:px-[18px]"
    >
      <ShareIcon size={16} />
      <span aria-live="polite">{copied ? "¡Enlace copiado!" : "Compartir"}</span>
    </button>
  );
}
