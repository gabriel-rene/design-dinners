"use client";

import { useId } from "react";

import FriesIcon from "./FriesIcon";

/**
 * Rail button that gives / takes back a papita. Matches the "Compartir" rail
 * button; once given, the dark glass turns into the mascot's mayo-cream sticker
 * and the carton fills with color. `pop` replays the pop each time it changes
 * (the parent bumps it on click and on double-tap). The aria-label replaces the
 * button's content, so the count is attached as its description.
 */
export default function FriesButton({
  given,
  count,
  pop,
  onToggle,
}: {
  given: boolean;
  count: number;
  pop: number;
  onToggle: () => void;
}) {
  const countId = useId();
  return (
    <button
      type="button"
      aria-pressed={given}
      aria-label={given ? "Quitar papitas" : "Dar papitas"}
      aria-describedby={countId}
      onClick={onToggle}
      className="group flex flex-col items-center gap-1 text-dd-cream focus-visible:outline-none"
    >
      <span
        key={pop}
        className={`grid h-12 w-12 place-items-center rounded-full transition-[transform,background-color] duration-200 group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-dd-yellow motion-reduce:transition-none ${
          given ? "bg-dd-cream" : "bg-black/40 backdrop-blur group-hover:bg-black/60"
        } ${pop > 0 ? "dd-fry-pop" : ""}`}
      >
        <FriesIcon filled={given} className="h-8 w-8" />
      </span>
      <span id={countId} data-testid="fries-count" className="text-[13px] font-bold tabular-nums [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
        {count}
      </span>
    </button>
  );
}
