import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import {
  EVENT_STORE,
  approveCommunityEvent,
  countPendingEvents,
  countRecentEventSubmissions,
  createEventUploadTicket,
  deleteCommunityEvent,
  getPublishedCommunityEventBySlug,
  hideCommunityEvent,
  insertCommunityEvent,
  listCommunityEventsByStatus,
  listUpcomingEvents,
  rejectCommunityEvent,
} from "./db";

import { slugify } from "@/lib/slug";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url);
const stamp = `OTROS-DB-${Date.now()}`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!isLocal || !serviceKey)("otros eventos db (local Supabase)", () => {
  const clientUrl = url || "http://skipped.invalid";
  const db = createClient(clientUrl, serviceKey ?? "skipped", { auth: { persistSession: false } });
  const ipHash = `ip-${stamp}`;

  async function submitted(daysAhead = 2, title = `${stamp} evento`) {
    const path = `${randomUUID()}.png`;
    await createEventUploadTicket(db, path, ipHash);
    await db.storage.from(EVENT_STORE.pendingBucket).upload(path, PNG, { contentType: "image/png" });
    const startsAt = new Date(Date.now() + daysAhead * 864e5).toISOString();
    const id = await insertCommunityEvent(db, {
      title, startsAt, venue: "Morena Coffee", link: "https://example.com/",
      description: null, organizer: null, price: "free", email: "ana@ejemplo.com",
      imagePath: path, imageWidth: 1, imageHeight: 1,
    }, ipHash);
    return { id, path };
  }

  afterAll(async () => {
    const { data } = await db.from("community_events").select("id").like("title", `${stamp}%`);
    for (const row of data ?? []) await deleteCommunityEvent(db, row.id);
    await db.from("community_event_uploads").delete().eq("ip_hash", ipHash);
  });

  it("submit → pending, not public, counted", async () => {
    const { id } = await submitted();
    expect((await listUpcomingEvents(db)).map((e) => e.id)).not.toContain(id);
    expect(await countPendingEvents(db)).toBeGreaterThan(0);
    expect(await countRecentEventSubmissions(db, ipHash)).toBeGreaterThan(0);
  });

  it("approve publishes once, moves the image, returns email data", async () => {
    const { id, path } = await submitted();
    const first = await approveCommunityEvent(db, id);
    expect(first?.notify).toMatchObject({ email: "ana@ejemplo.com", title: `${stamp} evento` });
    expect(await approveCommunityEvent(db, id)).toBeNull(); // second click: nothing, no second email
    const upcoming = await listUpcomingEvents(db);
    const shown = upcoming.find((e) => e.id === id);
    expect(shown?.imageUrl).toContain(`/otros-eventos/${path}`);
    expect(JSON.stringify(shown)).not.toContain("ana@ejemplo.com");
  });

  it("approving a past pending event publishes it but yields no email data", async () => {
    const { id } = await submitted(-3);
    const result = await approveCommunityEvent(db, id);
    expect(result).toEqual({ notify: null });
    const published = await listCommunityEventsByStatus(db, "published");
    expect(published.map((e) => e.id)).toContain(id);
  });

  it("lists upcoming soonest first", async () => {
    const later = await submitted(9);
    const sooner = await submitted(3);
    await approveCommunityEvent(db, later.id);
    await approveCommunityEvent(db, sooner.id);
    const ids = (await listUpcomingEvents(db)).map((e) => e.id);
    expect(ids.indexOf(sooner.id)).toBeLessThan(ids.indexOf(later.id));
  });

  it("reject only from pending; hide sends it back; delete removes it", async () => {
    const { id } = await submitted();
    expect(await rejectCommunityEvent(db, id)).toBe(true);
    expect(await rejectCommunityEvent(db, id)).toBe(false);
    expect(await approveCommunityEvent(db, id)).not.toBeNull(); // rejected → published is allowed
    expect(await hideCommunityEvent(db, id)).toBe(true);
    expect((await listUpcomingEvents(db)).map((e) => e.id)).not.toContain(id);
    const rejected = await listCommunityEventsByStatus(db, "rejected");
    expect(rejected.find((e) => e.id === id)?.imageUrl).toContain("token="); // signed private URL
    expect(await deleteCommunityEvent(db, id)).toBe(true);
    expect(await deleteCommunityEvent(db, id)).toBe(false);
  });

  it("refuses a reused upload path", async () => {
    const { path } = await submitted();
    await expect(insertCommunityEvent(db, {
      title: `${stamp} dup`, startsAt: new Date(Date.now() + 864e5).toISOString(), venue: "x", link: "https://x.com/",
      description: null, organizer: null, price: null, email: "b@ejemplo.com", imagePath: path, imageWidth: 1, imageHeight: 1,
    }, ipHash)).rejects.toMatchObject({ code: "23505" });
  });

  it("same title twice → slug x then x-2", async () => {
    const title = `${stamp} Café Ñandú`;
    const base = slugify(title);
    const a = await submitted(2, title);
    const b = await submitted(2, title);
    const { data } = await db.from("community_events").select("id,slug").in("id", [a.id, b.id]);
    const slugOf = (id: string) => data?.find((r) => r.id === id)?.slug;
    expect(slugOf(a.id)).toBe(base);
    expect(slugOf(b.id)).toBe(`${base}-2`);
  });

  it("getPublishedCommunityEventBySlug: null for pending and rejected, row for published", async () => {
    const title = `${stamp} por slug`;
    const { id } = await submitted(2, title);
    const slug = slugify(title);
    expect(await getPublishedCommunityEventBySlug(db, slug)).toBeNull(); // pending
    await approveCommunityEvent(db, id);
    const found = await getPublishedCommunityEventBySlug(db, slug);
    expect(found).toMatchObject({ id, slug, title, isPast: false });
    expect(found?.imageUrl).toContain("/otros-eventos/");
    expect(Object.keys(found ?? {})).not.toContain("submitterEmail");
    expect(JSON.stringify(found)).not.toContain("ana@ejemplo.com");
    await hideCommunityEvent(db, id); // → rejected
    expect(await getPublishedCommunityEventBySlug(db, slug)).toBeNull();
    expect(await getPublishedCommunityEventBySlug(db, "no-existe-" + stamp)).toBeNull();
  });

  it("a published event 3 days ago is still found, flagged isPast", async () => {
    const title = `${stamp} ya paso`;
    const { id } = await submitted(-3, title);
    await approveCommunityEvent(db, id);
    const found = await getPublishedCommunityEventBySlug(db, slugify(title));
    expect(found?.id).toBe(id);
    expect(found?.isPast).toBe(true);
    expect((await listUpcomingEvents(db)).map((e) => e.id)).not.toContain(id);
  });

  it("slug is stored lowercase and unreserved", async () => {
    const title = `${stamp} comunidad`;
    const { id } = await submitted(2, title);
    const { data } = await db.from("community_events").select("slug").eq("id", id).single();
    expect(data?.slug).toBe(slugify(title));
    expect(["enviar", "comunidad"]).not.toContain(data?.slug);
  });

  it("retries with a fresh slug when a concurrent insert takes it", async () => {
    const title = `${stamp} carrera`;
    const base = slugify(title);
    let raced = false;
    // Wrapper: right after the helper reads existing slugs, a rival row takes the slug it is about to pick.
    const racing = new Proxy(db, {
      get(target, prop, recv) {
        if (prop !== "from") return Reflect.get(target, prop, recv);
        return (table: string) => {
          const builder = target.from(table);
          if (table !== "community_events" || raced) return builder;
          return {
            select: (...a: Parameters<typeof builder.select>) => {
              const q = builder.select(...a);
              return {
                like: async (...x: Parameters<typeof q.like>) => {
                  const res = await q.like(...x);
                  raced = true;
                  const { error } = await target.from("community_events").insert({
                    slug: base, title: `${stamp} rival`, starts_at: new Date(Date.now() + 864e5).toISOString(),
                    venue: "x", link: "https://x.com/", submitter_email: "r@ejemplo.com",
                    image_path: `${randomUUID()}.png`, image_width: 1, image_height: 1,
                  });
                  expect(error).toBeNull();
                  return res;
                },
              };
            },
          };
        };
      },
    });
    const path = `${randomUUID()}.png`;
    await createEventUploadTicket(db, path, ipHash);
    const id = await insertCommunityEvent(racing, {
      title, startsAt: new Date(Date.now() + 864e5).toISOString(), venue: "x", link: "https://x.com/",
      description: null, organizer: null, price: null, email: "a@ejemplo.com", imagePath: path, imageWidth: 1, imageHeight: 1,
    }, ipHash);
    expect(raced).toBe(true);
    const { data } = await db.from("community_events").select("slug").eq("id", id).single();
    expect(data?.slug).toBe(`${base}-2`);
  });
});
