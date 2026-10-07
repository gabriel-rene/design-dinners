import { useId } from "react";

/** The mascot's own fry colors (public/brand/mascot-full-color.svg). */
export const FRY = { face: "#fdca33", shade: "#e19519", top: "#fddb86" } as const;
/** The mascot carton's darker side panel. */
const CARTON_SHADE = "#a3102a";

/** Four chunky sticks fanning out of the carton: [center x, top y, tilt in degrees]. */
const STICKS: [number, number, number][] = [
  [10.6, 5.4, -9],
  [14.8, 2.6, -3],
  [19, 3.6, 4],
  [23, 6.6, 11],
];

/**
 * A carton of papitas drawn like the Design Dinners mascot: yellow sticks with a
 * shaded edge, a ketchup-red carton with a darker side panel, a rim that dips
 * between two raised corners, a white shine and a black outline.
 * `filled` = this browser already gave one; otherwise it is a cream line
 * drawing that reads over the dark glass of the rail.
 */
export default function FriesIcon({ filled, className = "h-7 w-7" }: { filled: boolean; className?: string }) {
  const clip = `fries-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ink = filled ? "var(--dd-black)" : "var(--dd-cream)";

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      fill="none"
      stroke={ink}
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <defs>
        {/* Sticks only show above the rim, so the line drawing has no hidden strokes. */}
        <clipPath id={clip}>
          <path d="M0 0 H32 V13.4 H27 Q17 17.8 10.4 15.6 L5 13.4 H0 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clip})`}>
        {STICKS.map(([x, top, tilt]) => (
          <g key={x} transform={`rotate(${tilt} ${x} 20)`}>
            <rect x={x - 1.8} y={top} width="3.6" height="20" rx="0.6" fill={filled ? FRY.face : "none"} />
            {filled && <path d={`M${x + 0.7} ${top + 1.6} V22`} stroke={FRY.shade} strokeWidth="1.3" strokeLinecap="butt" />}
          </g>
        ))}
      </g>

      <path d="M5 13.4 L10.4 15.6 L12 29.2 H8.4 Z" fill={filled ? CARTON_SHADE : "none"} />
      <path d="M10.4 15.6 Q17 17.8 27 13.4 L23.8 29.2 H12 Z" fill={filled ? "var(--dd-red)" : "none"} />
      <path d="M23.9 17.4 l-0.35 2.1" stroke={filled ? "#fff" : ink} strokeWidth="1.2" opacity={filled ? 0.9 : 0.7} />
    </svg>
  );
}
