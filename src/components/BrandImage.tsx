/**
 * Image with a brand fallback: when `src` is missing, renders a flat block in
 * a brand color with the DD logo icon centered — never a gray box. Tones
 * rotate (red / yellow / brown) so grids without covers still read as a
 * deliberate composition.
 *
 * Plain <img>: covers come from Supabase Storage (remote) and logos are local
 * SVGs; neither needs next/image optimization or remotePatterns config.
 */

const TONE = {
  red: { bg: "bg-dd-red", icon: "/brand/icon-mayo-cream.svg" },
  yellow: { bg: "bg-dd-yellow", icon: "/brand/icon-black.svg" },
  brown: { bg: "bg-dd-brown", icon: "/brand/icon-mayo-cream.svg" },
} as const;

export type BrandTone = keyof typeof TONE;

const TONES: BrandTone[] = ["red", "yellow", "brown"];

/** Deterministic tone for a grid position. */
export function toneAt(index: number): BrandTone {
  return TONES[index % TONES.length];
}

export default function BrandImage({
  src,
  alt,
  tone = "red",
  className = "",
}: {
  src: string | null;
  alt: string;
  tone?: BrandTone;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  }

  const { bg, icon } = TONE[tone];

  return (
    <div
      role="img"
      aria-label={alt}
      className={`grid place-items-center ${bg} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" aria-hidden className="w-[26%] max-w-24 opacity-90" />
    </div>
  );
}
