// Server-only helpers for the Google Sheets RSVP feed (/api/rsvps/export).
// A Google Apps Script in the organizer's sheet pulls this feed on a timer
// and rewrites the sheet (see docs/google-sheets-rsvps.md).
import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { RSVP_STATUS_LABEL } from "./rsvp";
import type { RsvpStatus } from "./types";

/** Shorter tokens are refused, so a weak value can never open the feed. */
export const MIN_TOKEN_LENGTH = 32;

/**
 * True only for `Authorization: Bearer <token>` with the configured token.
 * Both sides are hashed first, so the compare is constant time and never
 * leaks the token length.
 */
export function isAuthorizedExport(header: string | null, token: string | undefined): boolean {
  if (!token || token.length < MIN_TOKEN_LENGTH || !header) return false;
  const match = /^Bearer\s+(\S+)$/.exec(header.trim());
  if (!match) return false;
  const given = createHash("sha256").update(match[1]).digest();
  const expected = createHash("sha256").update(token).digest();
  return timingSafeEqual(given, expected);
}

export type ExportRow = {
  event_title: string;
  event_date: string;
  name: string;
  email: string;
  status: RsvpStatus;
  created_at: string;
};

export const EXPORT_HEADER = ["Evento", "Fecha del evento", "Nombre", "Correo", "Estado", "Reservó"];

const TIME_ZONE = "America/Puerto_Rico";

/** "2026-10-23 19:00" in Puerto Rico time — sorts and reads well in a sheet. */
export function formatSheetDate(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/** Spreadsheet formula injection guard: a leading ' makes Sheets keep it as text. */
function sheetCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function buildExportRows(rows: ExportRow[]): string[][] {
  return rows.map((row) => [
    sheetCell(row.event_title),
    formatSheetDate(row.event_date),
    sheetCell(row.name),
    sheetCell(row.email),
    RSVP_STATUS_LABEL[row.status],
    formatSheetDate(row.created_at),
  ]);
}
