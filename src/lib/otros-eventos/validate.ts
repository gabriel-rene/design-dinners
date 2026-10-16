// Pure Otros eventos rules — no network, no Next, no Node built-ins. The send
// form (client) and the server actions both import this file, so their checks
// never drift apart.
import { isImageDimension, isPendingPath } from "@/lib/storage/image-rules";
import { EMAIL_RE } from "@/lib/rsvp";

export type Price = "free" | "paid";
export const PRICES: Price[] = ["free", "paid"];
export const PRICE_LABEL: Record<Price, string> = { free: "Gratis", paid: "Pago" };

export const LIMITS = { title: 100, venue: 120, organizer: 120, description: 300, email: 254, link: 300 } as const;
export const EVENTS_PER_DAY = 3;
export const UPLOADS_PER_DAY = 6;
export const MAX_DAYS_AHEAD = 365;

const TIME_ZONE = "America/Puerto_Rico";
/** Puerto Rico is UTC−4 all year (no daylight saving time). */
const PR_OFFSET = "-04:00";
const DAY_MS = 864e5;

const prDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** Today's date in Puerto Rico, "YYYY-MM-DD". */
export function prToday(now: Date = new Date()): string {
  return prDay.format(now);
}

/** A PR date + "HH:MM" as an ISO UTC instant, or null when it is not a real date/time. */
export function toStartsAt(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const instant = new Date(`${date}T${time}:00${PR_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  // "2026-02-30" rolls over to March: the PR day must read back the same.
  if (prDay.format(instant) !== date) return null;
  return instant.toISOString();
}

/** http(s) URL, "https://" added when missing; null when it cannot be a safe web link. */
export function normalizeEventLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null;
  const normalized = url.toString();
  return normalized.length > LIMITS.link ? null : normalized;
}

export type EventFields = {
  title: string;
  startsAt: string;
  venue: string;
  link: string;
  description: string | null;
  organizer: string | null;
  price: Price | null;
  email: string;
};

export type EventFieldErrors = Partial<
  Record<"title" | "date" | "time" | "venue" | "link" | "description" | "organizer" | "price" | "email" | "permission" | "image", string>
>;

export type RawEvent = Record<
  "title" | "date" | "time" | "venue" | "link" | "description" | "organizer" | "price" | "email" | "permission" | "imagePath" | "imageWidth" | "imageHeight",
  unknown
>;

const oneLine = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

export function parseEventFields(
  raw: Partial<RawEvent>,
  now: Date = new Date(),
): { ok: true; value: EventFields } | { ok: false; errors: EventFieldErrors } {
  const errors: EventFieldErrors = {};
  const title = oneLine(raw.title);
  const date = String(raw.date ?? "").trim();
  const time = String(raw.time ?? "").trim();
  const venue = oneLine(raw.venue);
  const linkText = String(raw.link ?? "").trim();
  const description = String(raw.description ?? "").replace(/\r\n?/g, "\n").trim();
  const organizer = oneLine(raw.organizer);
  const priceText = String(raw.price ?? "");
  const email = String(raw.email ?? "").trim();

  if (!title) errors.title = "Escribe el nombre del evento.";
  else if (title.length > LIMITS.title) errors.title = "Usa 100 letras o menos.";

  if (!date) errors.date = "Elige la fecha.";
  if (!time) errors.time = "Elige la hora.";
  let startsAt: string | null = null;
  if (date && time) {
    startsAt = toStartsAt(date, time);
    if (!startsAt) errors.date = "Esa fecha u hora no es válida.";
    else {
      const today = prToday(now);
      const last = prToday(new Date(now.getTime() + MAX_DAYS_AHEAD * DAY_MS));
      if (date < today) errors.date = "Esa fecha ya pasó.";
      else if (date > last) errors.date = "Solo aceptamos eventos de aquí a un año.";
    }
  }

  if (!venue) errors.venue = "Escribe dónde es.";
  else if (venue.length > LIMITS.venue) errors.venue = "Usa 120 letras o menos.";

  const link = normalizeEventLink(linkText);
  if (!linkText) errors.link = "Añade el enlace del evento.";
  else if (!link) errors.link = "Revisa el enlace. Debe ser una dirección web, como https://eventbrite.com/…";

  if (description.length > LIMITS.description) errors.description = "Usa 300 letras o menos.";
  if (organizer.length > LIMITS.organizer) errors.organizer = "Usa 120 letras o menos.";

  let price: Price | null = null;
  if (priceText) {
    if ((PRICES as string[]).includes(priceText)) price = priceText as Price;
    else errors.price = "Elige una opción.";
  }

  if (!email) errors.email = "Escribe tu correo.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    errors.email = "A ese correo le falta algo. Revisa que termine en algo como .com";
  }

  if (raw.permission !== true && raw.permission !== "on") {
    errors.permission = "Confirma que tienes permiso para compartirlo.";
  }

  if (Object.keys(errors).length > 0 || !startsAt || !link) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title, startsAt, venue, link,
      description: description || null,
      organizer: organizer || null,
      price, email,
    },
  };
}

export type EventInput = EventFields & { imagePath: string; imageWidth: number; imageHeight: number };

/** Server-side: the fields plus the already-uploaded poster. */
export function parseEventInput(
  raw: Partial<RawEvent>,
  now: Date = new Date(),
): { ok: true; value: EventInput } | { ok: false; errors: EventFieldErrors } {
  const fields = parseEventFields(raw, now);
  const errors: EventFieldErrors = fields.ok ? {} : { ...fields.errors };
  const imagePath = String(raw.imagePath ?? "");
  const imageWidth = Number(raw.imageWidth);
  const imageHeight = Number(raw.imageHeight);
  if (!isPendingPath(imagePath) || !isImageDimension(imageWidth) || !isImageDimension(imageHeight)) {
    errors.image = "Vuelve a subir la imagen.";
  }
  if (!fields.ok || errors.image) return { ok: false, errors };
  return { ok: true, value: { ...fields.value, imagePath, imageWidth, imageHeight } };
}

export function eventRawFromFormData(fd: FormData): Partial<RawEvent> {
  const keys = ["title", "date", "time", "venue", "link", "description", "organizer", "price", "email", "permission",
    "imagePath", "imageWidth", "imageHeight"] as const;
  return Object.fromEntries(keys.map((key) => [key, fd.get(key)]));
}
