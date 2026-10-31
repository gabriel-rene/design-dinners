"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { INSTAGRAM_URL } from "@/lib/social";

export type SiteNavCurrent = "eventos" | "vitrina" | "bid26";
export type SiteNavTone = "light" | "dark";

const LINKS: { key: SiteNavCurrent | "instagram"; label: string; href: string; external?: boolean }[] = [
  { key: "eventos", label: "Eventos", href: "/eventos" },
  { key: "vitrina", label: "Vitrina", href: "/vitrina" },
  { key: "bid26", label: "BID26", href: "/bid26" },
  { key: "instagram", label: "Instagram", href: INSTAGRAM_URL, external: true },
];

const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-4";

const TONES = {
  light: {
    link: `text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red ${FOCUS} focus-visible:outline-dd-black`,
    active: "text-dd-red",
    cta: `rounded-full border-2 border-dd-black bg-dd-red text-dd-cream dd-btn ${FOCUS} focus-visible:outline-dd-black`,
    burger: `text-dd-black ${FOCUS} focus-visible:outline-dd-black`,
  },
  dark: {
    link: `text-sm font-bold uppercase tracking-wide text-white underline decoration-dd-yellow decoration-2 underline-offset-4 transition-colors hover:text-dd-yellow ${FOCUS} focus-visible:outline-dd-yellow`,
    active: "text-dd-yellow",
    cta: `rounded-full border-2 border-dd-black bg-dd-cream text-dd-red dd-btn ${FOCUS} focus-visible:outline-dd-yellow`,
    burger: `text-dd-cream ${FOCUS} focus-visible:outline-dd-yellow`,
  },
} as const;

/**
 * Site navigation: inline links + WhatsApp button from md up; below md the
 * links fold into a hamburger panel while the WhatsApp button stays visible.
 */
export default function SiteNav({
  whatsappUrl,
  current,
  tone = "light",
}: {
  whatsappUrl: string;
  current?: SiteNavCurrent;
  tone?: SiteNavTone;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const t = TONES[tone];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const linkProps = (l: (typeof LINKS)[number]) =>
    l.external
      ? { href: l.href, target: "_blank", rel: "noopener noreferrer" }
      : { href: l.href, "aria-current": current === l.key ? ("page" as const) : undefined };

  return (
    <>
      <nav aria-label="Enlaces" className="hidden items-center gap-x-5 md:flex lg:gap-x-7">
        {LINKS.map((l) =>
          l.external ? (
            <a key={l.key} {...linkProps(l)} className={t.link}>
              {l.label}
            </a>
          ) : (
            <Link key={l.key} {...linkProps(l)} className={current === l.key ? `${t.link} ${t.active}` : t.link}>
              {l.label}
            </Link>
          ),
        )}
      </nav>

      <div className="flex items-center gap-2 md:ml-1">
        <a
          href={whatsappUrl}
          className={`${t.cta} px-4 py-2 font-display text-sm font-bold uppercase tracking-wide md:px-5`}
        >
          <span className="lg:hidden">WhatsApp</span>
          <span className="hidden lg:inline">Únete al WhatsApp</span>
        </a>

        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className={`grid size-10 place-items-center rounded-full md:hidden ${t.burger}`}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {open ? (
                <path d="M5 5l12 12M17 5L5 17" />
              ) : (
                <path d="M3 6h16M3 11h16M3 16h16" />
              )}
            </g>
          </svg>
        </button>
      </div>

      <div
        ref={panel}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-4 top-full z-50 mt-3 rounded-2xl border-2 border-dd-black bg-dd-cream p-2 text-dd-black shadow-[3px_5px_0_0_var(--dd-black)] md:hidden"
      >
        <nav aria-label="Menú">
          <ul>
            {LINKS.map((l) => {
              const cls = `block rounded-xl px-4 py-3.5 font-display text-2xl font-bold uppercase tracking-wide transition-colors hover:bg-dd-black/5 ${FOCUS} focus-visible:outline-dd-black ${current === l.key ? "text-dd-red" : ""}`;
              return (
                <li key={l.key}>
                  {l.external ? (
                    <a {...linkProps(l)} className={cls} onClick={() => setOpen(false)}>
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link {...linkProps(l)} className={cls} onClick={() => setOpen(false)}>
                      {l.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
