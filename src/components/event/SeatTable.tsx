import { plateRows, type PlateState } from "@/lib/rsvp";

const FILL: Record<PlateState, string> = {
  taken: "bg-dd-red",
  free: "bg-white",
  mine: "bg-dd-yellow dd-plate-pop",
};

function PlateRow({ seats, slots, compact }: { seats: PlateState[]; slots: number; compact: boolean }) {
  return (
    <div className={`flex w-full ${compact ? "gap-1" : "gap-[7px]"}`}>
      {seats.map((state, i) => (
        <span
          key={i}
          className={`aspect-square min-w-0 flex-1 rounded-full border-dd-black ${
            compact ? "border-[1.5px]" : "border-2"
          } ${FILL[state]}`}
        />
      ))}
      {/* Odd capacity: an empty slot keeps both rows' plates the same size. */}
      {Array.from({ length: slots - seats.length }, (_, i) => (
        <span key={`pad-${i}`} className="invisible aspect-square min-w-0 flex-1" />
      ))}
    </div>
  );
}

/** Seats as plates around one long table. Decorative: the text next to it
 *  carries the numbers for screen readers. Above PLATE_VISUAL_MAX seats it
 *  falls back to a simple bar. */
export default function SeatTable({
  capacity,
  confirmed,
  mineIndex = null,
  compact = false,
}: {
  capacity: number;
  confirmed: number;
  mineIndex?: number | null;
  compact?: boolean;
}) {
  const rows = plateRows(capacity, confirmed, mineIndex);

  if (!rows) {
    const pct = Math.min(100, Math.round((confirmed / capacity) * 100));
    return (
      <div aria-hidden className="h-3.5 w-full overflow-hidden rounded-full border-2 border-dd-black bg-white">
        <div className="h-full bg-dd-red" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  const step = compact ? 21 : 31; // plate + gap, px
  return (
    <div
      aria-hidden
      className={`mx-auto flex flex-col ${compact ? "gap-[5px]" : "gap-[7px]"}`}
      style={{ width: `min(100%, ${rows.top.length * step}px)` }}
    >
      <PlateRow seats={rows.top} slots={rows.top.length} compact={compact} />
      <div className={`w-full rounded-full border-dd-black bg-dd-brown ${compact ? "h-2.5 border-[1.5px]" : "h-3.5 border-2"}`} />
      <PlateRow seats={rows.bottom} slots={rows.top.length} compact={compact} />
    </div>
  );
}
