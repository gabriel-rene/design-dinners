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
  hideCommunityEvent,
  insertCommunityEvent,
  listCommunityEventsByStatus,
  listUpcomingEvents,
  rejectCommunityEvent,
} from "./db";

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

  async function submitted(daysAhead = 2) {
    const path = `${randomUUID()}.png`;
    await createEventUploadTicket(db, path, ipHash);
    await db.storage.from(EVENT_STORE.pendingBucket).upload(path, PNG, { contentType: "image/png" });
    const startsAt = new Date(Date.now() + daysAhead * 864e5).toISOString();
    const id = await insertCommunityEvent(db, {
      title: `${stamp} evento`, startsAt, venue: "Morena Coffee", link: "https://example.com/",
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
});
