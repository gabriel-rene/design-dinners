// Server-only data access for La Vitrina. Every function takes the Supabase
// service client so tests can pass their own. Public reads go through
// `vitrina_public` / `list_vitrina` only, so creator_email and ip_hash are
// never even selected outside the admin functions at the bottom.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { encodeCursor, type FeedCursor } from "./cursor";
import type { AdminWork, FeedPage, PublicWork, WorkStatus } from "./types";
import { FEED_PAGE_SIZE, LINK_KEYS, mimeForPath, type Badge, type WorkInput, type WorkLinks } from "./validate";

export const PENDING_BUCKET = "vitrina-pending";
export const PUBLIC_BUCKET = "vitrina";

const HOUR_MS = 36e5;
const DAY_MS = 24 * HOUR_MS;
const SIGNED_URL_SECONDS = 3600;

type LinkColumns = Record<`link_${(typeof LINK_KEYS)[number]}`, string | null>;

type PublicRow = LinkColumns & {
  id: string;
  title: string;
  description: string | null;
  creator_name: string;
  creator_role: string;
  badge: Badge | null;
  image_path: string;
  image_width: number;
  image_height: number;
  fries_count: number;
  published_at: string;
};

type AdminRow = Omit<PublicRow, "published_at"> & {
  status: WorkStatus;
  creator_email: string;
  created_at: string;
  reviewed_at: string | null;
  published_at: string | null;
};

const PUBLIC_COLUMNS =
  "id,title,description,creator_name,creator_role,badge,link_website,link_instagram,link_behance,link_linkedin,link_dribbble,image_path,image_width,image_height,fries_count,published_at";
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS},status,creator_email,created_at,reviewed_at`;

export function publicImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`;
}

function linksOf(row: LinkColumns): WorkLinks {
  const links: WorkLinks = {};
  for (const key of LINK_KEYS) {
    const value = row[`link_${key}`];
    if (value) links[key] = value;
  }
  return links;
}

function toPublicWork(row: PublicRow, given: Set<string>): PublicWork {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creatorName: row.creator_name,
    creatorRole: row.creator_role,
    badge: row.badge,
    links: linksOf(row),
    imageUrl: publicImageUrl(row.image_path),
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    friesCount: row.fries_count,
    publishedAt: row.published_at,
    given: given.has(row.id),
  };
}

async function givenSet(db: SupabaseClient, fanId: string | null, ids: string[]): Promise<Set<string>> {
  if (!fanId || ids.length === 0) return new Set();
  const { data, error } = await db.from("vitrina_fries").select("work_id").eq("fan_id", fanId).in("work_id", ids);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.work_id as string));
}

// ── Public feed ───────────────────────────────────────────────────────────

export async function listFeed(
  db: SupabaseClient,
  opts: { cursor: FeedCursor | null; onlyAvailable: boolean; fanId: string | null; limit?: number },
): Promise<FeedPage> {
  const limit = opts.limit ?? FEED_PAGE_SIZE;
  const { data, error } = await db.rpc("list_vitrina", {
    p_before_ts: opts.cursor?.ts ?? null,
    p_before_id: opts.cursor?.id ?? null,
    p_only_available: opts.onlyAvailable,
    p_limit: limit + 1,
  });
  if (error) throw error;
  const rows = (data ?? []) as PublicRow[];
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = rows.length > limit && last ? encodeCursor({ ts: last.published_at, id: last.id }) : null;
  const given = await givenSet(db, opts.fanId, page.map((row) => row.id));
  return { works: page.map((row) => toPublicWork(row, given)), nextCursor };
}

/** Caller must pass a valid uuid (PostgREST rejects anything else). */
export async function getPublishedWork(
  db: SupabaseClient,
  id: string,
  fanId: string | null,
): Promise<PublicWork | null> {
  const { data, error } = await db.from("vitrina_public").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toPublicWork(data as unknown as PublicRow, await givenSet(db, fanId, [id]));
}

// ── Rate limits ───────────────────────────────────────────────────────────

async function countSince(
  db: SupabaseClient,
  table: "vitrina_uploads" | "vitrina_works" | "vitrina_fries",
  ipHash: string,
  windowMs: number,
): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gt("created_at", new Date(Date.now() - windowMs).toISOString());
  if (error) throw error;
  return count ?? 0;
}

export const countRecentUploads = (db: SupabaseClient, ipHash: string) =>
  countSince(db, "vitrina_uploads", ipHash, DAY_MS);
export const countRecentSubmissions = (db: SupabaseClient, ipHash: string) =>
  countSince(db, "vitrina_works", ipHash, DAY_MS);
export const countRecentFries = (db: SupabaseClient, ipHash: string) =>
  countSince(db, "vitrina_fries", ipHash, HOUR_MS);

// ── Submissions ───────────────────────────────────────────────────────────

export async function createUploadTicket(
  db: SupabaseClient,
  path: string,
  ipHash: string | null,
): Promise<{ token: string }> {
  const { error: rowError } = await db.from("vitrina_uploads").insert({ path, ip_hash: ipHash });
  if (rowError) throw rowError;
  const { data, error } = await db.storage.from(PENDING_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("createSignedUploadUrl returned no data");
  return { token: data.token };
}

export async function isRecordedUpload(db: SupabaseClient, path: string): Promise<boolean> {
  const { data, error } = await db.from("vitrina_uploads").select("path").eq("path", path).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function pendingObjectInfo(
  db: SupabaseClient,
  path: string,
): Promise<{ size: number; mimetype: string } | null> {
  const { data, error } = await db.storage.from(PENDING_BUCKET).list("", { search: path, limit: 10 });
  if (error) throw error;
  const item = data?.find((object) => object.name === path);
  if (!item) return null;
  return { size: Number(item.metadata?.size ?? 0), mimetype: String(item.metadata?.mimetype ?? "") };
}

export async function insertWork(db: SupabaseClient, work: WorkInput, ipHash: string | null): Promise<string> {
  const { data, error } = await db
    .from("vitrina_works")
    .insert({
      title: work.title,
      description: work.description,
      creator_name: work.name,
      creator_email: work.email,
      creator_role: work.role,
      badge: work.badge,
      link_website: work.links.website ?? null,
      link_instagram: work.links.instagram ?? null,
      link_behance: work.links.behance ?? null,
      link_linkedin: work.links.linkedin ?? null,
      link_dribbble: work.links.dribbble ?? null,
      image_path: work.imagePath,
      image_width: work.imageWidth,
      image_height: work.imageHeight,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ── Papitas ───────────────────────────────────────────────────────────────

/** New count, or null when the work is not published. */
export async function toggleFry(
  db: SupabaseClient,
  input: { workId: string; fanId: string; ipHash: string | null; on: boolean },
): Promise<number | null> {
  const { data, error } = await db.rpc("toggle_fry", {
    p_work_id: input.workId,
    p_fan_id: input.fanId,
    p_ip_hash: input.ipHash,
    p_on: input.on,
  });
  if (error) throw error;
  return typeof data === "number" ? data : null;
}

// ── Admin (call only after requireAdmin()) ────────────────────────────────

const ADMIN_ORDER: Record<WorkStatus, { column: string; ascending: boolean }> = {
  pending: { column: "created_at", ascending: true },
  published: { column: "published_at", ascending: false },
  rejected: { column: "reviewed_at", ascending: false },
};

export async function listWorksByStatus(db: SupabaseClient, status: WorkStatus): Promise<AdminWork[]> {
  const order = ADMIN_ORDER[status];
  const { data, error } = await db
    .from("vitrina_works")
    .select(ADMIN_COLUMNS)
    .eq("status", status)
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as unknown as AdminRow[];

  const signed = new Map<string, string>();
  const privatePaths = rows.filter((row) => row.status !== "published").map((row) => row.image_path);
  if (privatePaths.length > 0) {
    const { data: urls, error: urlError } = await db.storage
      .from(PENDING_BUCKET)
      .createSignedUrls(privatePaths, SIGNED_URL_SECONDS);
    if (urlError) throw urlError;
    for (const item of urls ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  }

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    description: row.description,
    creatorName: row.creator_name,
    creatorEmail: row.creator_email,
    creatorRole: row.creator_role,
    badge: row.badge,
    links: linksOf(row),
    imageUrl: row.status === "published" ? publicImageUrl(row.image_path) : (signed.get(row.image_path) ?? null),
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    friesCount: row.fries_count,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
  }));
}

export async function countPending(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("vitrina_works")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

async function getRow(db: SupabaseClient, id: string) {
  const { data, error } = await db.from("vitrina_works").select("status,image_path").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as { status: WorkStatus; image_path: string } | null;
}

/** Download + upload + remove: works on every Storage version, and files are ≤ 4.5 MB. */
async function moveObject(db: SupabaseClient, from: string, to: string, path: string): Promise<void> {
  const { data: blob, error } = await db.storage.from(from).download(path);
  if (error || !blob) throw error ?? new Error(`download ${from}/${path} failed`);
  const { error: uploadError } = await db.storage
    .from(to)
    .upload(path, blob, { contentType: mimeForPath(path) ?? undefined, upsert: true });
  if (uploadError) throw uploadError;
  const { error: removeError } = await db.storage.from(from).remove([path]);
  if (removeError) throw removeError;
}

async function setStatus(db: SupabaseClient, id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db.from("vitrina_works").update(patch).eq("id", id);
  if (error) throw error;
}

/** Pending or rejected → published. Goes to the top of the feed. */
export async function approveWork(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status === "published") return false;
  await moveObject(db, PENDING_BUCKET, PUBLIC_BUCKET, row.image_path);
  const now = new Date().toISOString();
  await setStatus(db, id, { status: "published", published_at: now, reviewed_at: now });
  return true;
}

export async function rejectWork(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "pending") return false;
  await setStatus(db, id, { status: "rejected", reviewed_at: new Date().toISOString() });
  return true;
}

/** Published → rejected; the image goes back to the private bucket. */
export async function hideWork(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "published") return false;
  await moveObject(db, PUBLIC_BUCKET, PENDING_BUCKET, row.image_path);
  await setStatus(db, id, { status: "rejected", reviewed_at: new Date().toISOString() });
  return true;
}

export async function deleteWork(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row) return false;
  await db.storage.from(PENDING_BUCKET).remove([row.image_path]);
  await db.storage.from(PUBLIC_BUCKET).remove([row.image_path]);
  const { error } = await db.from("vitrina_works").delete().eq("id", id);
  if (error) throw error;
  await db.from("vitrina_uploads").delete().eq("path", row.image_path);
  return true;
}
