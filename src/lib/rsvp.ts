// Pure RSVP logic — no network, no Next imports. "now" is injectable so every
// function is deterministic in tests.
import { createHash } from "node:crypto";

import type { EventRow, RsvpRow, RsvpStatus } from "./types";

export const MAX_NAME = 120;
export const MAX_EMAIL = 254;
export const RATE_LIMIT_PER_HOUR = 5;
/** Above this many seats the plates get too small; show a bar instead. */
export const PLATE_VISUAL_MAX = 40;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type RsvpFieldErrors = { name?: string; email?: string };

export type ParsedRsvp =
  | { ok: true; name: string; email: string }
  | { ok: false; errors: RsvpFieldErrors };

export function parseRsvpInput(input: { name: unknown; email: unknown }): ParsedRsvp {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(input.email ?? "").trim();
  const errors: RsvpFieldErrors = {};

  if (!name) errors.name = "Escribe tu nombre.";
  else if (name.length > MAX_NAME) errors.name = "Ese nombre es muy largo. Usa 120 letras o menos.";

  if (!email) errors.email = "Escribe tu correo.";
  else if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    errors.email = "A ese correo le falta algo. Revisa que termine en algo como .com";
  }

  return errors.name || errors.email ? { ok: false, errors } : { ok: true, name, email };
}

export function isHoneypotFilled(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export type RsvpMode = "external" | "closed" | "open" | "full";

export function rsvpMode(
  event: Pick<EventRow, "event_date" | "registration_url" | "capacity"> & { confirmed_count: number },
  now: Date = new Date(),
): RsvpMode {
  if (new Date(event.event_date).getTime() < now.getTime()) return "closed";
  if (event.registration_url) return "external";
  if (event.capacity !== null && event.confirmed_count >= event.capacity) return "full";
  return "open";
}

export function seatsLeft(capacity: number | null, confirmed: number): number | null {
  return capacity === null ? null : Math.max(capacity - confirmed, 0);
}

export type PlateState = "taken" | "free" | "mine";

/** Seats alternate sides of one long table: seat 0 top, seat 1 bottom, … */
export function plateRows(
  capacity: number,
  confirmed: number,
  mineIndex: number | null = null,
): { top: PlateState[]; bottom: PlateState[] } | null {
  if (capacity > PLATE_VISUAL_MAX) return null;
  const top: PlateState[] = [];
  const bottom: PlateState[] = [];
  for (let seat = 0; seat < capacity; seat++) {
    const state: PlateState = seat === mineIndex ? "mine" : seat < confirmed ? "taken" : "free";
    (seat % 2 === 0 ? top : bottom).push(state);
  }
  return { top, bottom };
}

export function parseCapacity(raw: unknown): { value: number | null } | { error: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { value: null };
  if (!/^\d+$/.test(text)) return { error: "El cupo debe ser un número entero." };
  const value = Number(text);
  if (value < 1 || value > 1000) return { error: "El cupo debe estar entre 1 y 1000." };
  return { value };
}

/** First hop of `x-forwarded-for` (set by Vercel). */
export function clientIpFrom(forwardedFor: string | null): string | null {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first : null;
}

/** Salted SHA-256 so the raw IP is never stored. */
export function hashIp(ip: string | null, salt: string | undefined): string | null {
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
  confirmed: "Confirmado",
  waitlist: "Lista de espera",
  cancelled: "Cancelado",
};

function csvCell(value: string): string {
  // Spreadsheet formula injection guard.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function buildRsvpCsv(
  rows: Pick<RsvpRow, "name" | "email" | "status" | "created_at">[],
): string {
  const lines = [
    ["Nombre", "Correo", "Estado", "Reservó (UTC)"],
    ...rows.map((row) => [
      row.name,
      row.email,
      RSVP_STATUS_LABEL[row.status],
      new Date(row.created_at).toISOString(),
    ]),
  ].map((cols) => cols.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
