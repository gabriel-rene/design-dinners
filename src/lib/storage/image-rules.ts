// Pure image rules shared by La Vitrina and Otros eventos — no network, no Next
// imports, no Node built-ins: client forms and server actions both import this
// file, so the browser checks and the server checks can never drift apart.

/** 4.5 MB. Must equal `file_size_limit` of every image bucket (Vitrina and Otros eventos migrations). */
export const MAX_IMAGE_BYTES = 4_718_592;
export const IMAGE_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageMime = keyof typeof IMAGE_EXT;

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

/** A sane pixel size reported by the browser. */
export function isImageDimension(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= 20_000;
}
