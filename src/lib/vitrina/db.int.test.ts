import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import { decodeCursor } from "./cursor";
import {
  PENDING_BUCKET,
  PUBLIC_BUCKET,
  approveWork,
  countPending,
  countRecentSubmissions,
  createUploadTicket,
  deleteWork,
  getPublishedWork,
  hideWork,
  insertWork,
  isRecordedUpload,
  listFeed,
  listWorksByStatus,
  pendingObjectInfo,
  rejectWork,
  toggleFry,
} from "./db";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url);
const stamp = `VITRINA-DB-${Date.now()}`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!isLocal || !serviceKey)("vitrina db (local Supabase)", () => {
  // Suite callbacks still run when skipped, and createClient throws on an empty
  // URL; the placeholder never connects (no test body runs without real env).
  const clientUrl = url || "http://skipped.invalid";
  const db = createClient(clientUrl, serviceKey ?? "skipped", { auth: { persistSession: false } });
  const ipHash = `ip-${stamp}`;

  async function submitted(title = "obra") {
    const path = `${randomUUID()}.png`;
    await createUploadTicket(db, path, ipHash);
    await db.storage.from(PENDING_BUCKET).upload(path, PNG, { contentType: "image/png" });
    const id = await insertWork(
      db,
      {
        name: "Ana Prueba", email: "ana@ejemplo.com", role: "Ilustradora",
        title: `${stamp} ${title}`, description: null, badge: null,
        links: { website: "https://ana.example.com/" },
        imagePath: path, imageWidth: 1, imageHeight: 1,
      },
      ipHash,
    );
    return { id, path };
  }

  async function published(publishedAt: string, badge: string | null = null) {
    const { id } = await submitted();
    await db.from("vitrina_works").update({ status: "published", published_at: publishedAt, badge }).eq("id", id);
    return id;
  }

  afterAll(async () => {
    const { data } = await db.from("vitrina_works").select("id").like("title", `${stamp}%`);
    for (const row of data ?? []) await deleteWork(db, row.id);
    await db.from("vitrina_uploads").delete().eq("ip_hash", ipHash);
  });

  it("records upload tickets and sees the uploaded object", async () => {
    const { path } = await submitted();
    expect(await isRecordedUpload(db, path)).toBe(true);
    expect(await isRecordedUpload(db, `${randomUUID()}.png`)).toBe(false);
    expect(await pendingObjectInfo(db, path)).toEqual({ size: PNG.length, mimetype: "image/png" });
    expect(await countRecentSubmissions(db, ipHash)).toBeGreaterThanOrEqual(1);
    expect(await countPending(db)).toBeGreaterThanOrEqual(1);
  });

  it("pages the feed newest first, marks given, filters by badge", async () => {
    const a = await published("2099-02-01T00:00:03Z");
    const b = await published("2099-02-01T00:00:02Z", "open_to_projects");
    const c = await published("2099-02-01T00:00:01Z");
    const fan = randomUUID();
    await toggleFry(db, { workId: b, fanId: fan, ipHash, on: true });

    const first = await listFeed(db, { cursor: null, onlyAvailable: false, fanId: fan, limit: 2 });
    expect(first.works.map((w) => w.id)).toEqual([a, b]);
    expect(first.works[1]).toMatchObject({ given: true, friesCount: 1 });
    expect(first.works[0]).not.toHaveProperty("creatorEmail");

    const second = await listFeed(db, {
      cursor: decodeCursor(first.nextCursor), onlyAvailable: false, fanId: fan, limit: 1,
    });
    expect(second.works.map((w) => w.id)).toEqual([c]);

    const available = await listFeed(db, { cursor: null, onlyAvailable: true, fanId: null, limit: 1 });
    expect(available.works[0].id).toBe(b);

    expect((await getPublishedWork(db, b, fan))?.given).toBe(true);
  });

  it("approve moves the image to the public bucket; hide moves it back", async () => {
    const { id, path } = await submitted("aprobar");
    expect(await getPublishedWork(db, id, null)).toBeNull();

    expect(await approveWork(db, id)).toBe(true);
    expect(await approveWork(db, id)).toBe(false);
    expect((await db.storage.from(PUBLIC_BUCKET).download(path)).error).toBeNull();
    expect((await db.storage.from(PENDING_BUCKET).download(path)).error).not.toBeNull();
    const work = await getPublishedWork(db, id, null);
    expect(work?.imageUrl).toContain(`/storage/v1/object/public/vitrina/${path}`);

    expect(await hideWork(db, id)).toBe(true);
    expect(await getPublishedWork(db, id, null)).toBeNull();
    expect((await db.storage.from(PENDING_BUCKET).download(path)).error).toBeNull();
    const rejected = await listWorksByStatus(db, "rejected");
    const row = rejected.find((w) => w.id === id);
    expect(row?.creatorEmail).toBe("ana@ejemplo.com");
    expect(row?.imageUrl).toMatch(/token=/);
  });

  it("reject only from pending; delete removes row and image", async () => {
    const { id, path } = await submitted("borrar");
    expect(await rejectWork(db, id)).toBe(true);
    expect(await rejectWork(db, id)).toBe(false);
    expect(await deleteWork(db, id)).toBe(true);
    expect(await deleteWork(db, id)).toBe(false);
    expect((await db.storage.from(PENDING_BUCKET).download(path)).error).not.toBeNull();
    expect(await isRecordedUpload(db, path)).toBe(false);
  });
});
