// Server-only image storage shared by La Vitrina and Otros eventos: signed
// uploads, the pending → public publish step (re-encode), and cleanup. Each
// feature describes its own buckets and uploads table with an ImageStore.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_IMAGE_BYTES, mimeForPath, type ImageMime } from "./image-rules";

export type ImageStore = { pendingBucket: string; publicBucket: string; uploadsTable: string };

const SIGNED_URL_SECONDS = 3600;
/** Long edge of a published image, in px. */
export const PUBLIC_MAX_EDGE = 2560;
/** Short CDN cache on public images, so a hidden or deleted one stops being served quickly. */
const PUBLIC_CACHE_SECONDS = "60";

type ImageSize = { width: number; height: number };

export function publicImageUrl(store: ImageStore, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${store.publicBucket}/${path}`;
}

export async function createUploadTicket(
  db: SupabaseClient,
  store: ImageStore,
  path: string,
  ipHash: string | null,
): Promise<{ token: string }> {
  const { error: rowError } = await db.from(store.uploadsTable).insert({ path, ip_hash: ipHash });
  if (rowError) throw rowError;
  const { data, error } = await db.storage.from(store.pendingBucket).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("createSignedUploadUrl returned no data");
  return { token: data.token };
}

export async function isRecordedUpload(db: SupabaseClient, store: ImageStore, path: string): Promise<boolean> {
  const { data, error } = await db.from(store.uploadsTable).select("path").eq("path", path).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function pendingObjectInfo(
  db: SupabaseClient,
  store: ImageStore,
  path: string,
): Promise<{ size: number; mimetype: string } | null> {
  const { data, error } = await db.storage.from(store.pendingBucket).list("", { search: path, limit: 10 });
  if (error) throw error;
  const item = data?.find((object) => object.name === path);
  if (!item) return null;
  return { size: Number(item.metadata?.size ?? 0), mimetype: String(item.metadata?.mimetype ?? "") };
}

async function objectExists(db: SupabaseClient, bucket: string, path: string): Promise<boolean> {
  const { data, error } = await db.storage.from(bucket).list("", { search: path, limit: 10 });
  if (error) throw error;
  return Boolean(data?.some((object) => object.name === path));
}

/**
 * Download + upload + remove: works on every Storage version, and files are ≤ 4.5 MB.
 * Idempotent: if the source is already gone but the destination has the object
 * (a previous attempt died mid-move), the move counts as done.
 */
async function moveObject(db: SupabaseClient, from: string, to: string, path: string): Promise<void> {
  const { data: blob, error } = await db.storage.from(from).download(path);
  if (error || !blob) {
    if (await objectExists(db, to, path)) return;
    throw error ?? new Error(`download ${from}/${path} failed`);
  }
  const { error: uploadError } = await db.storage
    .from(to)
    .upload(path, blob, { contentType: mimeForPath(path) ?? undefined, upsert: true });
  if (uploadError) throw uploadError;
  const { error: removeError } = await db.storage.from(from).remove([path]);
  if (removeError) throw removeError;
}

/**
 * Re-encodes an image for the public bucket: applies the EXIF orientation,
 * fits the long edge in PUBLIC_MAX_EDGE, keeps the ICC profile and drops all
 * other metadata (EXIF, GPS, XMP, IPTC). Same format as the path extension.
 */
export async function encodePublicImage(
  input: Buffer,
  mime: ImageMime,
): Promise<{ body: Buffer; width: number; height: number }> {
  // Lazy: only the admin approve path needs libvips; the public feed must not load it.
  const { default: sharp } = await import("sharp");
  // Normal quality first; one lower step if the result would not fit the bucket (PNG is lossless).
  for (const quality of mime === "image/png" ? [100] : [85, 70]) {
    const image = sharp(input)
      .rotate()
      .resize({ width: PUBLIC_MAX_EDGE, height: PUBLIC_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .keepIccProfile();
    const encoded =
      mime === "image/jpeg"
        ? image.jpeg({ quality, mozjpeg: true })
        : mime === "image/webp"
          ? image.webp({ quality })
          : image.png({ compressionLevel: 9 });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    if (data.length <= MAX_IMAGE_BYTES) return { body: data, width: info.width, height: info.height };
  }
  throw new Error("re-encoded image is larger than the bucket limit");
}

/**
 * Pending → public, re-encoded (see encodePublicImage). Returns the published
 * size. Idempotent like moveObject: if the source is already gone but the public
 * object exists (a previous attempt died mid-move), the move counts as done and
 * the size is read from the public object.
 */
export async function publishObject(db: SupabaseClient, store: ImageStore, path: string): Promise<ImageSize | null> {
  const mime = mimeForPath(path);
  if (!mime) throw new Error(`unsupported image path ${path}`);
  const { data: blob, error } = await db.storage.from(store.pendingBucket).download(path);
  if (error || !blob) {
    if (!(await objectExists(db, store.publicBucket, path))) {
      throw error ?? new Error(`download ${store.pendingBucket}/${path} failed`);
    }
    const { data: existing } = await db.storage.from(store.publicBucket).download(path);
    if (!existing) return null;
    try {
      const { default: sharp } = await import("sharp");
      const meta = await sharp(Buffer.from(await existing.arrayBuffer())).metadata();
      return { width: meta.autoOrient.width, height: meta.autoOrient.height };
    } catch {
      return null;
    }
  }
  const { body, width, height } = await encodePublicImage(Buffer.from(await blob.arrayBuffer()), mime);
  const { error: uploadError } = await db.storage
    .from(store.publicBucket)
    .upload(path, body, { contentType: mime, upsert: true, cacheControl: PUBLIC_CACHE_SECONDS });
  if (uploadError) throw uploadError;
  const { error: removeError } = await db.storage.from(store.pendingBucket).remove([path]);
  if (removeError) throw removeError;
  return { width, height };
}

/** Public → private bucket (used when an admin hides a published item). */
export async function unpublishObject(db: SupabaseClient, store: ImageStore, path: string): Promise<void> {
  await moveObject(db, store.publicBucket, store.pendingBucket, path);
}

/** Removes the image from both buckets and its upload ticket. Throws on any failure. */
export async function removeImage(db: SupabaseClient, store: ImageStore, path: string): Promise<void> {
  for (const bucket of [store.pendingBucket, store.publicBucket]) {
    const { error } = await db.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
  const { error } = await db.from(store.uploadsTable).delete().eq("path", path);
  if (error) throw error;
}

export async function signedPendingUrls(
  db: SupabaseClient,
  store: ImageStore,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const { data, error } = await db.storage.from(store.pendingBucket).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  for (const item of data ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  return signed;
}
