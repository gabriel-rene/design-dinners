import Link from "next/link";
import { notFound } from "next/navigation";

import SeatTable from "@/components/event/SeatTable";
import {
  darkBtn,
  dangerBtn,
  primaryBtn,
  primaryBtnSm,
  secondaryBtn,
  secondaryBtnSm,
} from "@/components/admin/formStyles";
import { requireAdmin } from "@/lib/auth";
import { EVENT_TYPE_LABEL, formatArchiveDate, formatEventTime } from "@/lib/format";
import { getEventById, getEventRsvps } from "@/lib/queries";
import { PLATE_VISUAL_MAX } from "@/lib/rsvp";
import type { RsvpRow } from "@/lib/types";
import { changeRsvpStatus, updateCapacity } from "./actions";
import CapacityForm from "./CapacityForm";

const shortDateTime = new Intl.DateTimeFormat("es-PR", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Puerto_Rico",
});

/** "2 oct, 9:14 a. m." */
function formatShortDateTime(iso: string): string {
  return shortDateTime.format(new Date(iso));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function ArrowUp({ size = 14 }: { size?: number }) {
  return (
    <svg {...ICON} width={size} height={size} strokeWidth={2.6}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

// Each list row: one grid at sm+, a stacked card below. The column template is
// shared by the header row so the labels line up with the cells.
const CONFIRMED_COLS = "sm:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(9.5rem,1fr)_6.5rem]";
const WAITLIST_COLS = "lg:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(9.5rem,1fr)_auto]";

function Email({ value }: { value: string }) {
  return (
    <span className="block truncate text-sm text-dd-black/75" title={value}>
      {value}
    </span>
  );
}

/** The visible label only shows while the row is a stacked card; in the grid
 *  layout the column header says it (and screen readers still hear it). */
function When({ label, iso, gridFrom }: { label: string; iso: string; gridFrom: "sm" | "lg" }) {
  return (
    <span className="whitespace-nowrap text-sm text-dd-black/75">
      <span className={gridFrom === "lg" ? "lg:sr-only" : "sm:sr-only"}>{label} </span>
      {formatShortDateTime(iso)}
    </span>
  );
}

function SectionHeading({
  id,
  title,
  count,
  note,
}: {
  id: string;
  title: string;
  count: number;
  note: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="font-display text-[22px] font-bold uppercase leading-tight text-dd-black">
        {title} <span className="text-dd-brown">{count}</span>
      </h2>
      <p className="text-[13px] text-dd-black/65">{note}</p>
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-dashed border-dd-black/25 px-5 py-5 text-[15px] text-dd-black/65">
      {children}
    </p>
  );
}

export default async function ReservasPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [event, rsvps] = await Promise.all([getEventById(id), getEventRsvps(id)]);
  if (!event) {
    notFound();
  }

  const byStatus = (status: RsvpRow["status"]) => rsvps.filter((r) => r.status === status);
  const confirmed = byStatus("confirmed");
  const waitlist = byStatus("waitlist");
  const cancelled = byStatus("cancelled");

  const { capacity } = event;
  const free = capacity === null ? null : capacity - confirmed.length;
  const first = waitlist[0];

  const summaryLine =
    capacity === null
      ? `${plural(confirmed.length, "reserva", "reservas")} · sin límite`
      : confirmed.length > capacity
        ? `${confirmed.length} de ${capacity} · sobrecupo`
        : `${confirmed.length} de ${capacity} asientos`;

  // The seat table sizes itself from its parent: give the parent the table's
  // natural width (plate 16px + gap 5px per seat pair) so it sits beside the text.
  const tableWidth =
    capacity === null ? 0 : capacity <= PLATE_VISUAL_MAX ? Math.ceil(capacity / 2) * 21 : 220;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/eventos"
          className="inline-flex min-h-11 items-center text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
        >
          ← Eventos
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wide text-dd-brown">
              {formatArchiveDate(event.event_date)} · {formatEventTime(event.event_date)}
              {" · "}
              {EVENT_TYPE_LABEL[event.event_type]}
            </p>
            <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-tight text-balance text-dd-red">
              {event.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/eventos/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${secondaryBtn} gap-2`}
            >
              Ver página pública
              <svg {...ICON} width={14} height={14} strokeWidth={2.5}>
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
            <Link href={`/admin/eventos/${event.id}`} className={secondaryBtn}>
              Editar detalles
            </Link>
          </div>
        </div>
      </div>

      <section
        aria-label="Resumen de asientos"
        className="flex flex-col gap-6 rounded-lg border border-dd-black/15 bg-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-7"
      >
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-7 lg:shrink-0">
          {capacity !== null && (
            <div className="shrink-0" style={{ width: `min(100%, ${tableWidth}px)` }}>
              <SeatTable capacity={capacity} confirmed={confirmed.length} compact />
            </div>
          )}
          <div>
            <p className="font-display text-[30px] font-bold leading-none text-dd-black sm:whitespace-nowrap">{summaryLine}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                  waitlist.length > 0 ? "bg-[#FCE3B6] text-[#5C2913]" : "bg-dd-black/[0.06] text-dd-black/70"
                }`}
              >
                {waitlist.length} en espera
              </span>
              <span className="rounded-full bg-dd-black/[0.06] px-2.5 py-0.5 text-[13px] font-semibold text-dd-black/70">
                {plural(cancelled.length, "cancelado", "cancelados")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-start gap-x-5 gap-y-3">
          <CapacityForm action={updateCapacity.bind(null, event.id)} capacity={capacity} />
          {/* Aligns with the input row: label line (20px) + its gap (6px). */}
          <a
            href={`/admin/eventos/${event.id}/reservas/csv`}
            className={`${primaryBtn} gap-2 sm:mt-[26px]`}
          >
            <svg {...ICON} width={16} height={16} strokeWidth={2.4}>
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Descargar lista (CSV)
          </a>
        </div>
      </section>

      {free !== null && free > 0 && first && (
        <div
          role="status"
          className="flex flex-col gap-4 rounded-lg border border-dd-brown/35 bg-[#FCE9C8] px-5 py-4 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-start gap-4 sm:items-center">
            <span
              aria-hidden
              className="grid size-[34px] shrink-0 place-items-center rounded-full border-[1.5px] border-dd-black bg-dd-yellow text-dd-black"
            >
              <ArrowUp size={18} />
            </span>
            <p className="text-[15px] leading-snug text-[#3D1A0B]">
              <strong>{free === 1 ? "Se liberó 1 puesto." : `Hay ${free} puestos libres.`}</strong>{" "}
              Sube a la próxima persona de la lista de espera y escríbele para avisarle.
            </p>
          </div>
          <form action={changeRsvpStatus.bind(null, event.id, first.id, "confirmed")} className="shrink-0">
            <button type="submit" className={`${darkBtn} w-full sm:w-auto`}>
              Subir a {first.name}
            </button>
          </form>
        </div>
      )}

      <section aria-labelledby="confirmados-h">
        <SectionHeading
          id="confirmados-h"
          title="Confirmados"
          count={confirmed.length}
          note="Ordenados por hora de confirmación"
        />
        {confirmed.length === 0 ? (
          <EmptyBox>Todavía nadie ha reservado.</EmptyBox>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-dd-black/15 bg-white">
            <div
              aria-hidden
              className={`hidden gap-4 bg-dd-black/[0.035] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-dd-black/60 sm:grid ${CONFIRMED_COLS}`}
            >
              <span>#</span>
              <span>Nombre</span>
              <span>Correo</span>
              <span>Reservó</span>
              <span />
            </div>
            <ol>
              {confirmed.map((r, i) => (
                <li
                  key={r.id}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-dd-black/[0.08] px-4 py-3 first:border-t-0 sm:gap-4 sm:px-5 sm:first:border-t ${CONFIRMED_COLS}`}
                >
                  <span className="font-display text-base font-bold text-dd-black/55">{i + 1}</span>
                  <span className="truncate text-[15px] font-semibold text-dd-black">{r.name}</span>
                  <span className="col-start-2 sm:col-start-auto">
                    <Email value={r.email} />
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    <When label="Reservó" iso={r.created_at} gridFrom="sm" />
                  </span>
                  <form
                    action={changeRsvpStatus.bind(null, event.id, r.id, "cancelled")}
                    className="col-start-2 mt-2 sm:col-start-auto sm:mt-0 sm:flex sm:justify-end"
                  >
                    <button type="submit" className={dangerBtn}>
                      Cancelar
                    </button>
                  </form>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section aria-labelledby="espera-h">
        <SectionHeading
          id="espera-h"
          title="Lista de espera"
          count={waitlist.length}
          note="Se suben en orden de llegada"
        />
        {waitlist.length === 0 ? (
          <EmptyBox>Nadie en espera.</EmptyBox>
        ) : (
          <ol className="mt-3 overflow-hidden rounded-lg border border-dd-black/15 bg-white">
            {waitlist.map((r, i) => (
              <li
                key={r.id}
                className={`grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-dd-black/[0.08] px-4 py-3 first:border-t-0 lg:gap-4 lg:px-5 ${WAITLIST_COLS}`}
              >
                <span className="font-display text-base font-bold text-dd-brown">#{i + 1}</span>
                <span className="truncate text-[15px] font-semibold text-dd-black">{r.name}</span>
                <span className="col-start-2 lg:col-start-auto">
                  <Email value={r.email} />
                </span>
                <span className="col-start-2 lg:col-start-auto">
                  <When label="Reservó" iso={r.created_at} gridFrom="lg" />
                </span>
                <div className="col-start-2 mt-2 flex flex-wrap gap-2 lg:col-start-auto lg:mt-0 lg:justify-end">
                  <form action={changeRsvpStatus.bind(null, event.id, r.id, "confirmed")}>
                    <button type="submit" className={primaryBtnSm}>
                      <ArrowUp />
                      Subir a confirmado
                    </button>
                  </form>
                  <form action={changeRsvpStatus.bind(null, event.id, r.id, "cancelled")}>
                    <button type="submit" className={secondaryBtnSm}>
                      Quitar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="cancelados-h">
        <details className="group rounded-lg border border-dd-black/15 bg-white/55">
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-black/20 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <svg
                {...ICON}
                width={16}
                height={16}
                strokeWidth={2.5}
                className="text-dd-black/60 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
              <h2
                id="cancelados-h"
                className="font-display text-lg font-bold uppercase leading-tight text-dd-black/70"
              >
                Cancelados {cancelled.length}
              </h2>
            </span>
            <span className="text-[13px] text-dd-black/60">No cuentan para el cupo</span>
          </summary>
          {cancelled.length === 0 ? (
            <p className="border-t border-dd-black/[0.08] px-5 py-4 text-sm text-dd-black/65">
              Nadie ha cancelado.
            </p>
          ) : (
            <ul className="border-t border-dd-black/[0.08]">
              {cancelled.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dd-black/[0.06] px-5 py-3 text-sm text-dd-black/65 first:border-t-0"
                >
                  <span className="font-semibold line-through">{r.name}</span>
                  <span className="min-w-0 max-w-full truncate" title={r.email}>
                    {r.email}
                  </span>
                  <span className="sm:ml-auto">Canceló {formatShortDateTime(r.updated_at)}</span>
                  <form action={changeRsvpStatus.bind(null, event.id, r.id, "waitlist")} className="w-full sm:w-auto">
                    <button type="submit" className={secondaryBtnSm}>
                      Pasar a espera
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </div>
  );
}
