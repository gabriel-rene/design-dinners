"use client";

/* eslint-disable @next/next/no-img-element -- Supabase Storage image, same as BrandImage */
import { useState, type ReactNode } from "react";

import ShareButton from "@/components/event/ShareButton";
import type { PublicWork } from "@/lib/vitrina/types";
import { BADGE_LABEL, LINK_KEYS, LINK_LABEL } from "@/lib/vitrina/validate";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-yellow";
/** Keeps cream type legible where the gradient is thin over a bright image. */
const textShadow = "[text-shadow:0_1px_3px_rgb(0_0_0/0.55)]";

export default function VitrinaSlide({
  work,
  index,
  eager,
  frameProps,
  rail,
  overlay,
}: {
  work: PublicWork;
  index: number;
  eager: boolean;
  /** Task 7 attaches double-tap handlers and a ref here. */
  frameProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };
  /** Extra buttons above "Compartir" (the papitas button). */
  rail?: ReactNode;
  /** Layer above the image (the fries burst). */
  overlay?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const links = LINK_KEYS.filter((key) => work.links[key]);

  return (
    <article
      aria-label={`${work.title}, por ${work.creatorName}`}
      data-index={index}
      data-id={work.id}
      className="flex h-[100dvh] snap-start snap-always items-center justify-center md:py-6"
    >
      <div
        {...frameProps}
        className="relative h-full w-full touch-manipulation select-none overflow-hidden bg-dd-black md:aspect-[9/16] md:w-auto md:max-w-full md:rounded-2xl md:shadow-[0_0_0_1px_rgb(248_227_202/0.12)]"
      >
        <img
          src={work.imageUrl}
          alt=""
          aria-hidden
          loading={eager ? "eager" : "lazy"}
          draggable={false}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
        <img
          src={work.imageUrl}
          alt={work.title}
          width={work.imageWidth}
          height={work.imageHeight}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          draggable={false}
          className="relative h-full w-full object-contain"
        />
        {overlay}

        {/* Top scrim: the floating header pills sit over this on phones. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent md:h-20" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-32 md:px-6">
          <div className={`pointer-events-auto max-w-[calc(100%-4.5rem)] text-dd-cream ${textShadow}`}>
            {work.badge && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-dd-yellow px-2.5 py-1 font-display text-xs font-bold uppercase tracking-[0.06em] text-dd-black [text-shadow:none]">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-dd-black" />
                {BADGE_LABEL[work.badge]}
              </span>
            )}
            <h2 className="font-display text-[clamp(1.5rem,6.2vw,1.875rem)] font-bold leading-[1.05] tracking-[-0.01em]">
              {work.title}
            </h2>
            <p className="mt-1.5 text-[15px] leading-snug text-dd-cream/85">
              <span className="font-semibold text-dd-cream">{work.creatorName}</span> · {work.creatorRole}
            </p>
            {work.description && (
              <div className="mt-3">
                <p
                  className={`max-w-[60ch] whitespace-pre-line text-sm leading-relaxed text-dd-cream/85 ${
                    expanded ? "max-h-[38dvh] overflow-y-auto overscroll-contain" : "line-clamp-2"
                  }`}
                >
                  {work.description}
                </p>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className={`mt-1 rounded-sm text-sm font-semibold underline decoration-dd-yellow decoration-2 underline-offset-4 ${focusRing}`}
                >
                  {expanded ? "Ver menos" : "Ver más"}
                </button>
              </div>
            )}
            {links.length > 0 && (
              <ul aria-label={`Enlaces de ${work.creatorName}`} className="mt-4 flex flex-wrap gap-2 [text-shadow:none]">
                {links.map((key) => (
                  <li key={key}>
                    <a
                      href={work.links[key]}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className={`inline-flex items-center gap-1 rounded-full border-[1.5px] border-dd-cream/70 bg-black/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:border-dd-cream hover:bg-dd-cream hover:text-dd-black ${focusRing}`}
                    >
                      {LINK_LABEL[key]}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                        <path d="M3 1.5h5.5V7M8.5 1.5 1.5 8.5" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-3 flex flex-col items-center gap-4 md:right-4">
          {rail}
          <ShareButton url={`/vitrina/${work.id}`} title={`${work.title} — por ${work.creatorName}`} variant="rail" />
        </div>
      </div>
    </article>
  );
}
