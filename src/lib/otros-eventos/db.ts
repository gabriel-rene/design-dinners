// Server-only data access for Otros eventos. Every function takes the Supabase
// service client. Public reads go through `community_events_public` only, so
// submitter_email and ip_hash are never selected outside the admin functions.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify, uniqueSlug } from "@/lib/slug";

import {
  createUploadTicket, isRecordedUpload, pendingObjectInfo, publicImageUrl, publishObject,
  removeImage, signedPendingUrls, unpublishObject, type ImageStore,
} from "@/lib/storage/images";

import type { AdminCommunityEvent, CommunityEventStatus, PublicCommunityEvent } from "./types";
import { prToday, type EventInput, type Price } from "./validate";

export const EVENT_STORE: ImageStore = {
  pendingBucket: "otros-eventos-pending",
  publicBucket: "otros-eventos",
  uploadsTable: "community_event_uploads",
};

const DAY_MS = 864e5;
const PUBLIC_COLUMNS = "id,slug,title,starts_at,venue,link,description,organizer,price,image_path,image_width,image_height";
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS},status,submitter_email,created_at,reviewed_at,published_at`;

type PublicRow = {
  id: string; slug: string; title: string; starts_at: string; venue: string; link: string;
  description: string | null; organizer: string | null; price: Price | null;
  image_path: string; image_width: number; image_height: number;
};
type AdminRow = PublicRow & {
  status: CommunityEventStatus; submitter_email: string;
  created_at: string; reviewed_at: string | null; published_at: string | null;
};

export const eventImageUrl = (path: string) => publicImageUrl(EVENT_STORE, path);

function base(row: PublicRow) {
  return {
    id: row.id, slug: row.slug, title: row.title, startsAt: row.starts_at, venue: row.venue, link: row.link,
    description: row.description, organizer: row.organizer, price: row.price,
    imageWidth: row.image_width, imageHeight: row.image_height,
  };
}

// ── Public ────────────────────────────────────────────────────────────────

export async function listUpcomingEvents(db: SupabaseClient, limit = 60): Promise<PublicCommunityEvent[]> {
  const { data, error } = await db
    .from("community_events_public")
    .select(PUBLIC_COLUMNS)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as PublicRow[]).map((row) => ({ ...base(row), imageUrl: eventImageUrl(row.image_path) }));
}

/** Any published event by slug (also after its day), public columns only. */
export async function getPublishedCommunityEventBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<(PublicCommunityEvent & { isPast: boolean }) | null> {
  const { data, error } = await db
    .from("community_events")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as PublicRow;
  return {
    ...base(row),
    imageUrl: eventImageUrl(row.image_path),
    isPast: prToday(new Date(row.starts_at)) < prToday(),
  };
}

// ── Rate limits + submissions ─────────────────────────────────────────────

async function countSince(db: SupabaseClient, table: string, ipHash: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gt("created_at", new Date(Date.now() - DAY_MS).toISOString());
  if (error) throw error;
  return count ?? 0;
}

export const countRecentEventUploads = (db: SupabaseClient, ipHash: string) =>
  countSince(db, EVENT_STORE.uploadsTable, ipHash);
export const countRecentEventSubmissions = (db: SupabaseClient, ipHash: string) =>
  countSince(db, "community_events", ipHash);
export const createEventUploadTicket = (db: SupabaseClient, path: string, ipHash: string | null) =>
  createUploadTicket(db, EVENT_STORE, path, ipHash);
export const isRecordedEventUpload = (db: SupabaseClient, path: string) => isRecordedUpload(db, EVENT_STORE, path);
export const pendingEventObjectInfo = (db: SupabaseClient, path: string) => pendingObjectInfo(db, EVENT_STORE, path);

/** Unique among all rows (any status). A concurrent twin loses on the unique index and the caller retries. */
async function nextEventSlug(db: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title);
  const { data, error } = await db.from("community_events").select("slug").like("slug", `${base}%`);
  if (error) throw error;
  return uniqueSlug(base, (data ?? []).map((r) => r.slug as string));
}

export async function insertCommunityEvent(db: SupabaseClient, input: EventInput, ipHash: string | null): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const slug = await nextEventSlug(db, input.title);
    const { data, error } = await db
      .from("community_events")
      .insert({
        slug, title: input.title, starts_at: input.startsAt, venue: input.venue, link: input.link,
        description: input.description, organizer: input.organizer, price: input.price,
        submitter_email: input.email, image_path: input.imagePath,
        image_width: input.imageWidth, image_height: input.imageHeight, ip_hash: ipHash,
      })
      .select("id")
      .single();
    if (!error) return data.id as string;
    // A concurrent same-title insert took our slug: recompute and retry. Other 23505s (image_path) still throw.
    const slugRace = error.code === "23505" && /slug/.test(`${error.message} ${error.details ?? ""}`);
    if (!slugRace || attempt >= 3) throw error;
  }
}

// ── Admin (call only after requireAdmin()) ────────────────────────────────

const ADMIN_ORDER: Record<CommunityEventStatus, { column: string; ascending: boolean }> = {
  pending: { column: "created_at", ascending: true },
  published: { column: "starts_at", ascending: false },
  rejected: { column: "reviewed_at", ascending: false },
};

export async function listCommunityEventsByStatus(
  db: SupabaseClient,
  status: CommunityEventStatus,
): Promise<AdminCommunityEvent[]> {
  const order = ADMIN_ORDER[status];
  const { data, error } = await db
    .from("community_events")
    .select(ADMIN_COLUMNS)
    .eq("status", status)
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as unknown as AdminRow[];
  const signed = await signedPendingUrls(db, EVENT_STORE, rows.filter((r) => r.status !== "published").map((r) => r.image_path));
  return rows.map((row) => ({
    ...base(row),
    status: row.status,
    submitterEmail: row.submitter_email,
    imageUrl: row.status === "published" ? eventImageUrl(row.image_path) : (signed.get(row.image_path) ?? null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
  }));
}

export async function countPendingEvents(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("community_events")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

async function getRow(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("community_events")
    .select("status,image_path,submitter_email,title,starts_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as { status: CommunityEventStatus; image_path: string; submitter_email: string; title: string; starts_at: string } | null;
}

/** Updates only while the row is still in one of `expected`; false when it lost a race. */
async function transition(db: SupabaseClient, id: string, expected: CommunityEventStatus[], patch: Record<string, unknown>) {
  const { data, error } = await db.from("community_events").update(patch).eq("id", id).in("status", expected).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function approveCommunityEvent(
  db: SupabaseClient,
  id: string,
): Promise<{ notify: { email: string; title: string; startsAt: string } | null } | null> {
  const row = await getRow(db, id);
  if (!row || row.status === "published") return null;
  const size = await publishObject(db, EVENT_STORE, row.image_path);
  const now = new Date().toISOString();
  const changed = await transition(db, id, ["pending", "rejected"], {
    status: "published", published_at: now, reviewed_at: now,
    ...(size ? { image_width: size.width, image_height: size.height } : {}),
  });
  if (!changed) return null;
  // A past event still gets published, but its submitter is not emailed about it.
  const upcoming = prToday(new Date(row.starts_at)) >= prToday();
  return { notify: upcoming ? { email: row.submitter_email, title: row.title, startsAt: row.starts_at } : null };
}

export async function rejectCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "pending") return false;
  return transition(db, id, ["pending"], { status: "rejected", reviewed_at: new Date().toISOString() });
}

export async function hideCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "published") return false;
  await unpublishObject(db, EVENT_STORE, row.image_path);
  return transition(db, id, ["published"], { status: "rejected", reviewed_at: new Date().toISOString() });
}

/** Image first (throws on failure), so a row never outlives a stranded public image. */
export async function deleteCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row) return false;
  await removeImage(db, EVENT_STORE, row.image_path);
  const { error } = await db.from("community_events").delete().eq("id", id);
  if (error) throw error;
  return true;
}
