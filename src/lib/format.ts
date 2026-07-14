// Server-side date/label formatting. Always renders with an explicit Puerto
// Rico time zone so output is deterministic regardless of server locale and
// never depends on the client clock (no hydration mismatch: these strings are
// produced in Server Components only).

import type { EventRow } from "./types";

const TIME_ZONE = "America/Puerto_Rico";

const longDate = new Intl.DateTimeFormat("es-PR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const longDateWithYear = new Intl.DateTimeFormat("es-PR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const shortDateWithYear = new Intl.DateTimeFormat("es-PR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const time = new Intl.DateTimeFormat("es-PR", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});

const yearOf = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** "jueves, 6 de agosto" — adds the year only when it differs from the current one. */
export function formatEventDate(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const sameYear = yearOf.format(date) === yearOf.format(now);
  return (sameYear ? longDate : longDateWithYear).format(date);
}

/** "6 de agosto de 2026" — compact, always with year (past-events archive). */
export function formatArchiveDate(isoDate: string): string {
  return shortDateWithYear.format(new Date(isoDate));
}

/** "7:00 p. m." */
export function formatEventTime(isoDate: string): string {
  return time.format(new Date(isoDate));
}

export const EVENT_TYPE_LABEL: Record<EventRow["event_type"], string> = {
  cena: "Cena",
  taller: "Taller",
  otro: "Evento",
};
