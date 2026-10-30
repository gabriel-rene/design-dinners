"use client";

import { useEffect, useRef, useState } from "react";

import s from "./bid26.module.css";

export type PeopleRow = {
  studio: string;
  people: string[];
  works: { id: string; title: string; cover: string }[];
};

/**
 * "Quién está detrás": names set large, studio, and links to each work.
 * With a fine pointer, a small cover trails the cursor (below-right, so the
 * hovered row stays readable).
 */
export default function PeopleIndex({ rows }: { rows: PeopleRow[] }) {
  const peek = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      if (peek.current) {
        peek.current.style.left = `${e.clientX + 28}px`;
        peek.current.style.top = `${e.clientY + 28}px`;
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <>
      <ul onPointerLeave={() => setCover(null)}>
        {rows.map((r) => (
          <li key={r.studio} onPointerEnter={(e) => e.pointerType === "mouse" && setCover(r.works[0].cover)}>
            <span className={s.names}>{r.people.join(", ")}</span>
            <span className={s.studio}>{r.studio}</span>
            <span className={s.workLinks}>
              {r.works.map((w) => (
                <a key={w.id} href={`#${w.id}`} onPointerEnter={() => setCover(w.cover)}>
                  {w.title}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div ref={peek} className={s.peek} data-on={cover !== null} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative cursor preview of an already-loaded image */}
        {cover && <img src={cover} alt="" />}
      </div>
    </>
  );
}
