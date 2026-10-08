"use client";

/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadMoreWorks } from "@/app/vitrina/actions";
import type { PublicWork } from "@/lib/vitrina/types";

import WorkSlide from "./WorkSlide";

type LoadState = "idle" | "loading" | "error";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black";

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={up ? "rotate-180" : undefined}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function VitrinaFeed({
  initialWorks,
  initialCursor,
  onlyAvailable,
}: {
  initialWorks: PublicWork[];
  initialCursor: string | null;
  onlyAvailable: boolean;
}) {
  const [works, setWorks] = useState(initialWorks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [active, setActive] = useState(0);
  // Hides the text over every image at once, so swiping stays clean.
  const [textHidden, setTextHidden] = useState(false);
  const toggleText = useCallback(() => setTextHidden((v) => !v), []);
  const scroller = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  // A second observer callback can fire before React re-renders with "loading".
  const busy = useRef(false);

  const loadMore = useCallback(
    async (force = false) => {
      if (!cursor || busy.current || (loadState === "error" && !force)) return;
      busy.current = true;
      setLoadState("loading");
      try {
        const page = await loadMoreWorks(cursor, onlyAvailable);
        setWorks((prev) => [...prev, ...page.works.filter((w) => !prev.some((p) => p.id === w.id))]);
        setCursor(page.nextCursor);
        setLoadState("idle");
      } catch {
        setLoadState("error");
      } finally {
        busy.current = false;
      }
    },
    [cursor, loadState, onlyAvailable],
  );
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // Which slide is on screen; the next page loads two slides before the end.
  // The observer is rebuilt when slides are added, which re-reports the slide
  // on screen, so a short page chains into the next one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const total = works.length;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (index !== 0) moved.current = true;
          setActive(index);
          if (index >= total - 2) void loadMoreRef.current();
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [works.length]);

  // The address bar follows the piece on screen (after the first move).
  useEffect(() => {
    const work = works[active];
    if (work && moved.current) window.history.replaceState(null, "", `/vitrina/${work.id}`);
  }, [active, works]);

  const go = useCallback((delta: number) => {
    const root = scroller.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollBy({ top: delta * root.clientHeight, behavior: reduce ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "h") {
        toggleText();
      }
    }
    window.addEventListener("keydown", onKey);
    // Marks the feed as keyboard-ready (after hydration); e2e waits on it.
    scroller.current?.setAttribute("data-keys-ready", "");
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleText]);

  const pill = `pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold backdrop-blur transition-colors sm:px-3.5 sm:text-sm ${focusRing}`;
  const cta = `inline-flex h-12 items-center rounded-full border-2 border-dd-black bg-dd-red px-7 font-display text-base font-bold uppercase tracking-wide text-dd-cream dd-btn dd-btn--on-dark ${focusRing}`;

  return (
    <div className="fixed inset-0 bg-dd-black text-dd-cream">
      <h1 className="sr-only">La Vitrina</h1>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 md:px-6 md:pt-5">
        <Link href="/" className={`${pill} bg-black/40 hover:bg-black/60`}>
          <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="h-[18px] w-[18px]" />
          <span className="max-sm:sr-only">Design Dinners</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={onlyAvailable ? "/vitrina" : "/vitrina?disponible=1"}
            aria-label={onlyAvailable ? "Disponible: mostrando solo gente disponible. Ver todas" : "Disponible: ver solo gente disponible para trabajo"}
            className={`${pill} border-[1.5px] ${
              onlyAvailable
                ? "border-dd-yellow bg-dd-yellow text-dd-black hover:bg-[#ffb93f]"
                : "border-dd-cream/45 bg-black/40 hover:border-dd-cream/80 hover:bg-black/60"
            }`}
          >
            <span
              aria-hidden
              className={`grid h-3.5 w-3.5 place-items-center rounded-full border-[1.5px] ${
                onlyAvailable ? "border-dd-black bg-dd-black text-dd-yellow" : "border-dd-cream/70"
              }`}
            >
              {onlyAvailable && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5.2 4.1 7.3 8 2.8" />
                </svg>
              )}
            </span>
            Disponible
          </Link>
          <Link href="/vitrina/enviar" className={`${pill} border-2 border-dd-black bg-dd-red text-dd-cream dd-btn dd-btn--on-dark`}>
            Enviar mi trabajo
          </Link>
        </div>
      </header>

      <div
        ref={scroller}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {works.map((work, index) => (
          <WorkSlide
            key={work.id}
            work={work}
            index={index}
            eager={index === 0}
            textHidden={textHidden}
            onToggleText={toggleText}
          />
        ))}
        <section
          aria-label={works.length === 0 ? "Sin obras" : "Final de La Vitrina"}
          className="flex h-[100dvh] snap-start flex-col items-center justify-center px-8 text-center"
        >
          {works.length === 0 || (!cursor && loadState !== "error") ? (
            <div aria-hidden className="mb-8 grid h-40 w-40 place-items-center rounded-full bg-dd-cream md:h-44 md:w-44">
              <img src="/brand/mascot-full-color.svg" alt="" loading="lazy" className="dd-mascot w-24 md:w-28" />
            </div>
          ) : null}
          {works.length === 0 ? (
            <>
              <h2 className="max-w-md font-display text-[clamp(1.875rem,7vw,2.5rem)] font-bold uppercase leading-[0.98]">
                {onlyAvailable ? "Todavía no hay obras de gente disponible." : "Todavía no hay obras."}
              </h2>
              <p className="mt-4 max-w-sm text-[17px] leading-relaxed text-dd-cream/85">Sé la primera persona en compartir la tuya.</p>
            </>
          ) : loadState === "error" ? (
            <>
              <h2 className="font-display text-2xl font-bold">No pudimos cargar más.</h2>
              <p className="mt-2 text-dd-cream/85">Revisa tu conexión e intenta otra vez.</p>
              <button
                type="button"
                onClick={() => void loadMore(true)}
                className={`mt-6 inline-flex h-11 items-center rounded-full bg-dd-cream px-6 font-bold text-dd-black transition-colors hover:bg-white ${focusRing}`}
              >
                Reintentar
              </button>
            </>
          ) : cursor ? (
            <p aria-live="polite" className="flex items-center gap-3 text-dd-cream/80">
              <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="h-6 w-6 animate-pulse motion-reduce:animate-none" />
              Cargando…
            </p>
          ) : (
            <>
              <h2 className="font-display text-[clamp(2.25rem,9vw,3.25rem)] font-bold uppercase leading-[0.95]">Llegaste al final</h2>
              <p className="mt-4 max-w-sm text-[17px] leading-relaxed text-dd-cream/85">¿Qué estás cocinando?</p>
            </>
          )}
          {(works.length === 0 || (!cursor && loadState !== "error")) && (
            <div className="mt-8 flex flex-col items-center gap-5">
              <Link href="/vitrina/enviar" className={cta}>
                Enviar mi trabajo
              </Link>
              {works.length === 0 && onlyAvailable && (
                <Link href="/vitrina" className="rounded-sm text-sm font-semibold underline decoration-dd-yellow decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-yellow">
                  Ver todas las obras
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {works.length > 1 && (
        <nav aria-label="Navegar obras" className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex lg:right-10">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={active === 0}
            aria-label="Obra anterior"
            className={`grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-dd-cream/25 bg-white/10 transition-colors hover:border-dd-cream hover:bg-dd-cream hover:text-dd-black disabled:pointer-events-none disabled:opacity-30 ${focusRing}`}
          >
            <Chevron up />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Obra siguiente"
            className={`grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-dd-cream/25 bg-white/10 transition-colors hover:border-dd-cream hover:bg-dd-cream hover:text-dd-black ${focusRing}`}
          >
            <Chevron />
          </button>
        </nav>
      )}
    </div>
  );
}
