import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// These tests write and delete rows: only ever against the LOCAL stack.
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url);
const stamp = `VITRINA-SCHEMA-${Date.now()}`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!isLocal || !serviceKey || !anonKey)("vitrina schema (local Supabase)", () => {
  // Suite callbacks still run when skipped, and createClient throws on an empty
  // URL; the placeholders never connect (no test body runs without real env).
  const clientUrl = url || "http://skipped.invalid";
  const service = createClient(clientUrl, serviceKey ?? "skipped", { auth: { persistSession: false } });
  const anon = createClient(clientUrl, anonKey ?? "skipped", { auth: { persistSession: false } });

  async function makeWork(overrides: Record<string, unknown> = {}) {
    const { data, error } = await service
      .from("vitrina_works")
      .insert({
        title: `${stamp} obra`,
        creator_name: "Ana Prueba",
        creator_email: "ana@ejemplo.com",
        creator_role: "Ilustradora",
        link_website: "https://ana.example.com",
        image_path: `${randomUUID()}.png`,
        image_width: 1080,
        image_height: 1350,
        ...overrides,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  afterAll(async () => {
    await service.from("vitrina_works").delete().like("title", `${stamp}%`);
  });

  it("gives anon nothing: tables, view, functions", async () => {
    await makeWork({ status: "published", published_at: new Date().toISOString() });
    for (const table of ["vitrina_works", "vitrina_fries", "vitrina_uploads", "vitrina_public"]) {
      const { data } = await anon.from(table).select("*").limit(1);
      expect(data ?? [], table).toHaveLength(0);
    }
    const list = await anon.rpc("list_vitrina", {});
    expect(list.data ?? []).toHaveLength(0);
    const fry = await anon.rpc("toggle_fry", {
      p_work_id: randomUUID(), p_fan_id: randomUUID(), p_ip_hash: null, p_on: true,
    });
    expect(fry.error).not.toBeNull();
  });

  it("requires at least one link", async () => {
    await expect(makeWork({ link_website: null })).rejects.toMatchObject({ code: "23514" });
  });

  it("vitrina_public shows published rows only, without private columns", async () => {
    const pendingId = await makeWork();
    const publishedId = await makeWork({ status: "published", published_at: new Date().toISOString() });
    const { data } = await service.from("vitrina_public").select("*").in("id", [pendingId, publishedId]);
    expect(data?.map((r) => r.id)).toEqual([publishedId]);
    expect(Object.keys(data![0])).not.toContain("creator_email");
    expect(Object.keys(data![0])).not.toContain("ip_hash");
  });

  it("toggle_fry is idempotent and ignores unpublished work", async () => {
    const id = await makeWork({ status: "published", published_at: new Date().toISOString() });
    const fan = randomUUID();
    const call = (on: boolean, workId = id) =>
      service.rpc("toggle_fry", { p_work_id: workId, p_fan_id: fan, p_ip_hash: "h", p_on: on });
    expect((await call(true)).data).toBe(1);
    expect((await call(true)).data).toBe(1);
    expect((await call(false)).data).toBe(0);
    expect((await call(false)).data).toBe(0);
    const pendingId = await makeWork();
    expect((await call(true, pendingId)).data).toBeNull();
  });

  it("list_vitrina pages newest first and filters by badge", async () => {
    const a = await makeWork({ status: "published", published_at: "2099-01-01T00:00:03Z" });
    const b = await makeWork({ status: "published", published_at: "2099-01-01T00:00:02Z", badge: "open_to_work" });
    const c = await makeWork({ status: "published", published_at: "2099-01-01T00:00:01Z" });
    const first = await service.rpc("list_vitrina", { p_limit: 2 });
    expect(first.data!.map((r: { id: string }) => r.id)).toEqual([a, b]);
    const next = await service.rpc("list_vitrina", {
      p_before_ts: first.data![1].published_at, p_before_id: b, p_limit: 1,
    });
    expect(next.data!.map((r: { id: string }) => r.id)).toEqual([c]);
    const available = await service.rpc("list_vitrina", { p_only_available: true, p_limit: 1 });
    expect(available.data![0].id).toBe(b);
  });

  it("pending bucket is private and capped at 4.5 MB", async () => {
    const { data: bucket } = await service.storage.getBucket("vitrina-pending");
    expect(bucket?.public).toBe(false);
    expect(bucket?.file_size_limit).toBe(4718592);
    const path = `${randomUUID()}.png`;
    await service.storage.from("vitrina-pending").upload(path, PNG, { contentType: "image/png" });
    const { error } = await anon.storage.from("vitrina-pending").download(path);
    expect(error).not.toBeNull();
    await service.storage.from("vitrina-pending").remove([path]);
  });
});
