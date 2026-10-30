"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { Bid26Work } from "@/content/bid26";

import s from "./bid26.module.css";

/** Where each print lands once the pile has spread: [x vw, y vh, rotation deg]. */
const SPOTS: [number, number, number][] = [
  [-38, -22, -7],
  [-9, -4, 4],
  [19, -24, 5],
  [-26, -2, -4],
  [0, -20, -3],
  [42, -1, 6],
  [-42, -2, 5],
  [9, 0, -5],
  [38, -21, -6],
  [-19, -23, 3],
  [26, -3, 4],
];

/**
 * The opening: all eleven works stacked like a pile of prints on a red table.
 * Scrolling through the tall hero spreads them out. Prints are visible and
 * stacked before any script runs; reduced motion shows the spread at rest.
 */
export default function HeroPile({ works, children }: { works: Bid26Work[]; children: React.ReactNode }) {
  const heroRef = useRef<HTMLElement>(null);
  const printRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const place = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = reduced || travel <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / travel));
      const e = 1 - Math.pow(1 - p, 3);
      const small = window.innerWidth < 820;
      printRefs.current.forEach((el, i) => {
        if (!el) return;
        const [x, y, rot] = SPOTS[i % SPOTS.length];
        const start = (i - 5) * 2.2;
        const tx = x * e * (small ? 1.25 : 1);
        const ty = (small ? y * 1.2 + 8 : y) * e;
        const r = start + (rot - start) * e;
        el.style.transform = `translate(-50%, -50%) translate(${tx}vw, ${ty}vh) rotate(${r}deg) scale(${1 - 0.12 * e})`;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };

    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={heroRef} className={s.hero} aria-labelledby="bid26-title">
      <div className={s.stage}>
        {works.map((w, i) => (
          <div
            key={w.id}
            ref={(el) => {
              printRefs.current[i] = el;
            }}
            className={s.print}
            style={{ transform: `translate(-50%, -50%) rotate(${(i - 5) * 2.2}deg)` }}
            aria-hidden
          >
            <Image src={w.images[0].src} alt="" width={240} height={300} sizes="240px" priority={i > 7} />
            <span>{w.title}</span>
          </div>
        ))}
        {children}
      </div>
    </section>
  );
}
