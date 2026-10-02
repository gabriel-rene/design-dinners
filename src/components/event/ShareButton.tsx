"use client";

import { useState } from "react";

export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // The visitor closed the share sheet: nothing else to do.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Blocked or unsupported: fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copia este enlace:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-2 border-dd-black px-4 text-sm font-bold dd-btn md:h-[42px] md:px-[18px]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v13" />
      </svg>
      <span aria-live="polite">{copied ? "¡Enlace copiado!" : "Compartir"}</span>
    </button>
  );
}
