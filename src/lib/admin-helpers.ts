// Server-only helpers shared by the three admin action modules. No `next/headers`
// dependency of its own — callers pass in the session-bound Supabase client from
// `requireAdmin()` so uploads run under the admin's identity (RLS enforces it).

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

/** True only for a syntactically valid absolute http(s) URL. */
export function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function extensionFor(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  if (fromName) return fromName;
  return MIME_EXT[file.type] ?? "bin";
}

export type ImageUploadResult = { url: string | null } | { error: string };

/**
 * Uploads the file at `formData.get(field)` to `images/{folder}/{uuid}.{ext}`
 * and returns its public URL. When no file is provided (empty file input), keeps
 * `existingUrl` untouched. Validates content-type (`image/*`) and size (≤4 MB)
 * server-side — the client-side checks in ImageField are only a courtesy.
 *
 * On update-with-a-new-image the previous object is intentionally left in the
 * bucket (YAGNI — orphaned images are cheap; a cleanup job can sweep later).
 */
export async function uploadImageIfPresent(
  supabase: SupabaseClient,
  formData: FormData,
  field: string,
  folder: "events" | "speakers",
  existingUrl: string | null,
): Promise<ImageUploadResult> {
  const entry = formData.get(field);

  // No selection → keep whatever URL the record already had.
  if (!(entry instanceof File) || entry.size === 0) {
    return { url: existingUrl };
  }

  if (!entry.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen." };
  }
  if (entry.size > MAX_IMAGE_BYTES) {
    return { error: "La imagen no puede pesar más de 4 MB." };
  }

  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(entry)}`;
  const { error } = await supabase.storage.from("images").upload(path, entry, {
    contentType: entry.type,
    upsert: false,
  });
  if (error) {
    return { error: "No pudimos subir la imagen. Intenta de nuevo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(path);

  return { url: publicUrl };
}
