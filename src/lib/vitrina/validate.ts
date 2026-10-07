// Pure La Vitrina rules — no network, no Next imports, no Node built-ins: the
// client submit form and the server actions both import this file, so the
// browser checks and the server checks can never drift apart.
import { EMAIL_RE, isUuid } from "@/lib/rsvp";

export type Badge = "open_to_work" | "open_to_projects";
export const BADGES: Badge[] = ["open_to_work", "open_to_projects"];
export const BADGE_LABEL: Record<Badge, string> = {
  open_to_work: "Disponible para trabajo",
  open_to_projects: "Acepto proyectos",
};

export const LINK_KEYS = ["website", "instagram", "behance", "linkedin", "dribbble"] as const;
export type LinkKey = (typeof LINK_KEYS)[number];
export type WorkLinks = Partial<Record<LinkKey, string>>;
export const LINK_LABEL: Record<LinkKey, string> = {
  website: "Sitio web",
  instagram: "Instagram",
  behance: "Behance",
  linkedin: "LinkedIn",
  dribbble: "Dribbble",
};

export const LIMITS = { name: 120, email: 254, role: 60, title: 80, description: 300 } as const;
/** 4.5 MB. Must equal `file_size_limit` of both buckets in the Vitrina migration. */
export const MAX_IMAGE_BYTES = 4_718_592;
export const IMAGE_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageMime = keyof typeof IMAGE_EXT;

export const SUBMISSIONS_PER_DAY = 3;
export const UPLOADS_PER_DAY = 6;
export const FRIES_PER_HOUR = 60;
export const FEED_PAGE_SIZE = 8;
export const FAN_COOKIE = "dd_fan";

export function isImageMime(value: string): value is ImageMime {
  return Object.hasOwn(IMAGE_EXT, value);
}

export function mimeForPath(path: string): ImageMime | null {
  const ext = path.split(".").pop();
  const hit = (Object.entries(IMAGE_EXT) as [ImageMime, string][]).find(([, e]) => e === ext);
  return hit ? hit[0] : null;
}

/** Spanish error message, or null when the file is fine. */
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!isImageMime(file.type)) return "La imagen debe ser JPG, PNG o WebP.";
  if (file.size <= 0) return "Elige una imagen.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen no puede pesar más de 4.5 MB.";
  return null;
}

const PENDING_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Only object names we generate (`{uuid}.{ext}` at the bucket root). */
export function isPendingPath(value: string): boolean {
  return PENDING_PATH_RE.test(value);
}

export function parseFanId(value: string | null | undefined): string | null {
  return value && isUuid(value) ? value.toLowerCase() : null;
}

/**
 * Accepts full URLs, bare domains ("ana.design") and, for Instagram, "@handle".
 * Returns a normalized http(s) URL, or null when it cannot be a safe web link.
 */
export function normalizeLink(key: LinkKey, raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const handle = key === "instagram" ? text.match(/^@([A-Za-z0-9._]{1,30})$/) : null;
  if (handle) return `https://www.instagram.com/${handle[1]}/`;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Credentials in a link ("https://instagram.com@evil.com") are a deceptive-link trick.
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".") || withScheme.length > 300) return null;
  const normalized = url.toString();
  // Cap the stored form too: percent-encoding can grow a short input past 300.
  return normalized.length > 300 ? null : normalized;
}

export type WorkFields = {
  name: string;
  email: string;
  role: string;
  title: string;
  description: string | null;
  badge: Badge | null;
  links: WorkLinks;
};

export type WorkFieldErrors = Partial<
  Record<"name" | "email" | "role" | "title" | "description" | "badge" | "links" | "ownership" | "image", string>
>;

export type RawWork = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  title?: unknown;
  description?: unknown;
  badge?: unknown;
  ownership?: unknown;
  links?: Partial<Record<LinkKey, unknown>>;
  imagePath?: unknown;
  imageWidth?: unknown;
  imageHeight?: unknown;
};

const oneLine = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

export function parseWorkFields(
  raw: RawWork,
): { ok: true; value: WorkFields } | { ok: false; errors: WorkFieldErrors } {
  const errors: WorkFieldErrors = {};
  const name = oneLine(raw.name);
  const email = String(raw.email ?? "").trim();
  const role = oneLine(raw.role);
  const title = oneLine(raw.title);
  // Keep the creator's line breaks. Browsers send textarea newlines as CRLF;
  // store plain "\n" so each break counts once, like the DB length check.
  const description = String(raw.description ?? "").replace(/\r\n?/g, "\n").trim();
  const badgeText = String(raw.badge ?? "");

  if (!name) errors.name = "Escribe tu nombre.";
  else if (name.length > LIMITS.name) errors.name = "Ese nombre es muy largo. Usa 120 letras o menos.";

  if (!email) errors.email = "Escribe tu correo.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    errors.email = "A ese correo le falta algo. Revisa que termine en algo como .com";
  }

  if (!role) errors.role = "Escribe tu rol o disciplina.";
  else if (role.length > LIMITS.role) errors.role = "Usa 60 letras o menos.";

  if (!title) errors.title = "Ponle un título a tu obra.";
  else if (title.length > LIMITS.title) errors.title = "Usa 80 letras o menos.";

  if (description.length > LIMITS.description) errors.description = "Usa 300 letras o menos.";

  let badge: Badge | null = null;
  if (badgeText) {
    if ((BADGES as string[]).includes(badgeText)) badge = badgeText as Badge;
    else errors.badge = "Elige una opción de la lista.";
  }

  const links: WorkLinks = {};
  let badLink: LinkKey | null = null;
  for (const key of LINK_KEYS) {
    const text = String(raw.links?.[key] ?? "").trim();
    if (!text) continue;
    const url = normalizeLink(key, text);
    if (url) links[key] = url;
    else badLink ??= key;
  }
  if (badLink) {
    errors.links = `Revisa el enlace de ${LINK_LABEL[badLink]}. Debe ser una dirección web, como https://tusitio.com`;
  } else if (Object.keys(links).length === 0) {
    errors.links = "Añade al menos un enlace para que la gente te encuentre.";
  }

  if (raw.ownership !== true && raw.ownership !== "on") errors.ownership = "Confirma que la obra es tuya.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: { name, email, role, title, description: description || null, badge, links } };
}

export type WorkInput = WorkFields & { imagePath: string; imageWidth: number; imageHeight: number };

const isDimension = (n: number) => Number.isInteger(n) && n > 0 && n <= 20_000;

/** Server-side: the fields plus the already-uploaded image. */
export function parseWorkInput(
  raw: RawWork,
): { ok: true; value: WorkInput } | { ok: false; errors: WorkFieldErrors } {
  const fields = parseWorkFields(raw);
  const errors: WorkFieldErrors = fields.ok ? {} : { ...fields.errors };
  const imagePath = String(raw.imagePath ?? "");
  const imageWidth = Number(raw.imageWidth);
  const imageHeight = Number(raw.imageHeight);
  if (!isPendingPath(imagePath) || !isDimension(imageWidth) || !isDimension(imageHeight)) {
    errors.image = "Vuelve a subir la imagen.";
  }
  if (!fields.ok || errors.image) return { ok: false, errors };
  return { ok: true, value: { ...fields.value, imagePath, imageWidth, imageHeight } };
}

export function workRawFromFormData(fd: FormData): RawWork {
  return {
    name: fd.get("name"),
    email: fd.get("email"),
    role: fd.get("role"),
    title: fd.get("title"),
    description: fd.get("description"),
    badge: fd.get("badge"),
    ownership: fd.get("ownership"),
    links: Object.fromEntries(LINK_KEYS.map((key) => [key, fd.get(`link_${key}`)])),
    imagePath: fd.get("imagePath"),
    imageWidth: fd.get("imageWidth"),
    imageHeight: fd.get("imageHeight"),
  };
}
