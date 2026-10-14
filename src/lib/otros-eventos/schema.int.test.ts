import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// These tests write and delete rows: only ever against the LOCAL stack.
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url);
const stamp = `OTROS-SCHEMA-${Date.now()}`;

describe.skipIf(!isLocal || !serviceKey || !anonKey)("otros eventos schema (local Supabase)", () => {
  // Suite callbacks still run when skipped, and createClient throws on an empty
  // URL; the placeholders never connect (no test body runs without real env).
  const clientUrl = url || "http://skipped.invalid";
  const service = createClient(clientUrl, serviceKey ?? "skipped", { auth: { persistSession: false } });
  const anon = createClient(clientUrl, anonKey ?? "skipped", { auth: { persistSession: false } });

  async function makeEvent(overrides: Record<string, unknown> = {}) {
    const { data, error } = await service
      .from("community_events")
      .insert({
        title: `${stamp} evento`,
        venue: "Morena Coffee",
        link: "https://example.com",
        submitter_email: "ana@ejemplo.com",
        image_path: `${randomUUID()}.png`,
        image_width: 1080,
        image_height: 1350,
        starts_at: new Date(Date.now() + 864e5).toISOString(),
        ...overrides,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  afterAll(async () => {
    await service.from("community_events").delete().like("title", `${stamp}%`);
  });

  it("gives anon nothing", async () => {
    for (const table of ["community_events", "community_event_uploads", "community_events_public"]) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error ?? data?.length === 0).toBeTruthy();
      expect(data ?? []).toHaveLength(0);
    }
    const { data } = await anon.storage.from("otros-eventos-pending").list();
    expect(data ?? []).toHaveLength(0);
  });

  it("public view hides pending, rejected and past events", async () => {
    const now = new Date().toISOString();
    const live = await makeEvent({ status: "published", published_at: now });
    const pending = await makeEvent();
    const rejected = await makeEvent({ status: "rejected" });
    const past = await makeEvent({
      status: "published",
      published_at: now,
      starts_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    });
    const { data } = await service.from("community_events_public").select("id").like("title", `${stamp}%`);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(live);
    expect(ids).not.toContain(pending);
    expect(ids).not.toContain(rejected);
    expect(ids).not.toContain(past);
  });

  it("keeps an event for its whole Puerto Rico day", async () => {
    // 23:59 PR today = 03:59 UTC tomorrow.
    const prToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Puerto_Rico" }).format(new Date());
    const lateTonight = new Date(`${prToday}T23:59:00-04:00`).toISOString();
    const earlyToday = new Date(`${prToday}T00:30:00-04:00`).toISOString();
    const now = new Date().toISOString();
    const late = await makeEvent({ status: "published", published_at: now, starts_at: lateTonight });
    const early = await makeEvent({ status: "published", published_at: now, starts_at: earlyToday });
    const { data } = await service.from("community_events_public").select("id").in("id", [late, early]);
    expect((data ?? []).map((r) => r.id).sort()).toEqual([late, early].sort());
  });

  it("never exposes submitter_email or ip_hash", async () => {
    await makeEvent({ status: "published", published_at: new Date().toISOString() });
    const { error } = await service.from("community_events_public").select("submitter_email").limit(1);
    expect(error).not.toBeNull();
    const { error: ipError } = await service.from("community_events_public").select("ip_hash").limit(1);
    expect(ipError).not.toBeNull();
  });

  it("rejects non-web links and published rows without published_at", async () => {
    await expect(makeEvent({ link: "javascript:alert(1)" })).rejects.toBeTruthy();
    await expect(makeEvent({ status: "published" })).rejects.toBeTruthy();
  });
});
