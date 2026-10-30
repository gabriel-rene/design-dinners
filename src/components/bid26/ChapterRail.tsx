"use client";

import { useEffect, useRef, useState } from "react";

import type { Bid26Chapter } from "@/content/bid26";

import s from "./bid26.module.css";

/** Sticky chapter menu; the pill of the chapter in view takes that chapter's color. */
export default function ChapterRail({ chapters, counts }: { chapters: Bid26Chapter[]; counts: number[] }) {
  const [active, setActive] = useState(-1);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.chapter));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    links.current[active]?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  return (
    <nav className={s.rail} aria-label="Capítulos">
      {chapters.map((c, i) => (
        <a
          key={c.title}
          ref={(el) => {
            links.current[i] = el;
          }}
          href={`#capitulo-${i + 1}`}
          aria-current={active === i ? "true" : undefined}
          style={{ "--chap": c.bg, "--chap-fg": c.fg } as React.CSSProperties}
        >
          {c.short}
          <span className={s.count}>{counts[i]}</span>
        </a>
      ))}
    </nav>
  );
}
