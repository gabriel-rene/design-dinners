"use client";

import { useEffect, useRef } from "react";

import { FRY } from "./FriesIcon";

/** `aim` is the direction the fan opens, in degrees (-90 = straight up). */
export type Burst = { id: number; x: number; y: number; aim?: number };

const FRIES = 7;
const SPARKLES = 2;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"; // launch: fast, then slows to the apex
const GRAVITY = "cubic-bezier(0.5, 0, 0.75, 0)"; // fall: slow at the apex, then accelerates
const CENTER = "translate(-50%, -50%)";

/** One isometric stick, drawn like the mascot's: light top, shaded side, black outline. */
function FryPiece() {
  return (
    <svg viewBox="0 0 14 44" className="absolute left-0 top-0 h-[54px] w-[18px] opacity-0">
      <g stroke="var(--dd-black)" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M2 5 L5 2 H12 V39 L9 42 H2 Z" fill={FRY.face} />
        <path d="M9 5 L12 2 V39 L9 42 Z" fill={FRY.shade} />
        <path d="M2 5 L5 2 H12 L9 5 Z" fill={FRY.top} />
      </g>
    </svg>
  );
}

/** The four-point twinkle that floats around the mascot. */
function Sparkle({ fill }: { fill: string }) {
  return (
    <svg viewBox="-8 -8 16 16" className="absolute left-0 top-0 h-6 w-6 opacity-0">
      <path
        d="M0 -7 C0.9 -1.4 1.4 -0.9 7 0 C1.4 0.9 0.9 1.4 0 7 C-0.9 1.4 -1.4 0.9 -7 0 C-1.4 -0.9 -0.9 -1.4 0 -7Z"
        fill={fill}
        stroke="var(--dd-black)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function jitter(amount: number) {
  return (Math.random() * 2 - 1) * amount;
}

/** A fry flies out along its own spoke, tumbles over the apex and drops out of frame. */
function flyFry(el: Element, i: number, aim: number) {
  const spoke = aim + (i - (FRIES - 1) / 2) * 21 + jitter(5); // a fan opening upward
  const rad = (spoke * Math.PI) / 180;
  const reach = 74 + (i % 3) * 20 + jitter(8);
  const dx = Math.cos(rad) * reach;
  const dy = Math.sin(rad) * reach;
  const tilt = (spoke + 90) * 0.4; // leans the way it flies, but stays upright enough to read as a fry
  const spin = (dx < 0 ? -1 : 1) * (65 + jitter(20)); // a lazy tumble, so each piece still reads as a fry
  const scale = 0.82 + (i % 3) * 0.1;
  return el.animate(
    [
      { transform: `${CENTER} translate(0px, 0px) rotate(${tilt}deg) scale(0.35)`, opacity: 0, easing: EASE_OUT },
      { transform: `${CENTER} translate(${dx}px, ${dy}px) rotate(${tilt + spin * 0.25}deg) scale(${scale})`, opacity: 1, offset: 0.42, easing: GRAVITY },
      { transform: `${CENTER} translate(${dx * 1.3}px, ${dy + 190}px) rotate(${tilt + spin}deg) scale(${scale * 0.9})`, opacity: 0 },
    ],
    { duration: 660 + (i % 3) * 40, fill: "forwards" },
  );
}

/** Two twinkles pop beside the tap point, a beat after the fries leave. */
function twinkle(el: Element, i: number) {
  const side = i === 0 ? -1 : 1;
  const x = side * (40 + jitter(6));
  const y = -44 + jitter(8) + i * 12;
  return el.animate(
    [
      { transform: `${CENTER} translate(${x}px, ${y}px) rotate(0deg) scale(0)`, opacity: 1, easing: EASE_OUT },
      { transform: `${CENTER} translate(${x}px, ${y}px) rotate(${side * 45}deg) scale(1.1)`, opacity: 1, offset: 0.4 },
      { transform: `${CENTER} translate(${x}px, ${y}px) rotate(${side * 90}deg) scale(0)`, opacity: 0 },
    ],
    { duration: 520, delay: 70 + i * 60, easing: "ease-in-out", fill: "both" },
  );
}

/**
 * A handful of papitas fly out of the tap point, tumble and fall out of the
 * frame (~700 ms), with two of the mascot's twinkles. Web Animations only.
 * Pieces start invisible, so nothing flashes before the animation starts;
 * with reduced motion it reports done at once and never animates.
 */
export default function FriesBurst({ burst, onDone }: { burst: Burst; onDone: (id: number) => void }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone(burst.id);
      return;
    }
    let cancelled = false;
    const pieces = Array.from(el.children);
    const animations = [
      ...pieces.slice(0, FRIES).map((piece, i) => flyFry(piece, i, burst.aim ?? -90)),
      ...pieces.slice(FRIES).map(twinkle),
    ];
    Promise.all(animations.map((a) => a.finished))
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) onDone(burst.id);
      });
    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
    };
  }, [burst.id, burst.aim, onDone]);

  return (
    <div ref={root} aria-hidden data-testid="fries-burst" className="pointer-events-none absolute z-10" style={{ left: burst.x, top: burst.y }}>
      {Array.from({ length: FRIES }, (_, i) => (
        <FryPiece key={`fry-${i}`} />
      ))}
      {Array.from({ length: SPARKLES }, (_, i) => (
        <Sparkle key={`sparkle-${i}`} fill={i === 0 ? "#fff" : "var(--dd-yellow)"} />
      ))}
    </div>
  );
}
