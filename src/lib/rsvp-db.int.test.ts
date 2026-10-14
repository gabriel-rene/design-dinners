import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

import {
  cancelRsvpByToken,
  claimNextReminder,
  countRecentByIp,
  getRsvpByCancelToken,
  insertRsvp,
  isEventOpenForRsvp,
  releaseReminder,
  setEventCapacity,
  setRsvpStatus,
} from "./rsvp-db";

const url = process.env.DATABASE_URL;
const stamp = `RSVPTEST-${Date.now()}`;

describe.skipIf(!url)("rsvp-db (needs DATABASE_URL)", () => {
  // Suite callbacks still run when skipped; neon() throws on an empty URL, and
  // this placeholder never connects (no test body runs without DATABASE_URL).
  const sql = neon(url ?? "postgres://skipped:skipped@localhost/skipped");
  const future = new Date(Date.now() + 7 * 864e5).toISOString();
  const past = new Date(Date.now() - 7 * 864e5).toISOString();

  async function makeEvent(opts: { capacity: number | null; date?: string; registrationUrl?: string | null }) {
    const rows = (await sql`
      insert into events (title, event_date, capacity, registration_url)
      values (${`${stamp} event`}, ${opts.date ?? future}, ${opts.capacity}, ${opts.registrationUrl ?? null})
      returning id
    `) as { id: string }[];
    return rows[0].id;
  }

  afterAll(async () => {
    await sql`delete from events where title like ${`${stamp}%`}`;
  });

  it("confirms until full, then waitlists, with positions", async () => {
    const eventId = await makeEvent({ capacity: 2 });
    const a = await insertRsvp(sql, { eventId, name: "A", email: "a@x.co", ipHash: null });
    const b = await insertRsvp(sql, { eventId, name: "B", email: "b@x.co", ipHash: null });
    const c = await insertRsvp(sql, { eventId, name: "C", email: "c@x.co", ipHash: null });
    expect(a).toMatchObject({ status: "confirmed", position: 1 });
    expect(b).toMatchObject({ status: "confirmed", position: 2 });
    expect(c).toMatchObject({ status: "waitlist", position: 1 });
  });

  it("ignores a duplicate email, case-insensitively", async () => {
    const eventId = await makeEvent({ capacity: null });
    await insertRsvp(sql, { eventId, name: "A", email: "Dup@X.co", ipHash: null });
    expect(await insertRsvp(sql, { eventId, name: "A2", email: "dup@x.co", ipHash: null })).toBeNull();
    const rows = (await sql`select count(*)::int as n from rsvps where event_id = ${eventId}`) as { n: number }[];
    expect(rows[0].n).toBe(1);
  });

  it("refuses past events and events with an external link", async () => {
    const pastId = await makeEvent({ capacity: null, date: past });
    const extId = await makeEvent({ capacity: null, registrationUrl: "https://example.com" });
    expect(await insertRsvp(sql, { eventId: pastId, name: "A", email: "a@x.co", ipHash: null })).toBeNull();
    expect(await insertRsvp(sql, { eventId: extId, name: "A", email: "a@x.co", ipHash: null })).toBeNull();
    expect(await isEventOpenForRsvp(sql, pastId)).toBe(false);
    expect(await isEventOpenForRsvp(sql, extId)).toBe(false);
  });

  it("never overbooks under concurrent RSVPs", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        insertRsvp(sql, { eventId, name: `P${i}`, email: `p${i}@x.co`, ipHash: null }),
      ),
    );
    expect(results.filter((r) => r?.status === "confirmed")).toHaveLength(1);
    expect(results.filter((r) => r?.status === "waitlist")).toHaveLength(5);
  });

  it("never overbooks when the event id differs only in letter case", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        insertRsvp(sql, {
          eventId: i % 2 === 0 ? eventId : eventId.toUpperCase(),
          name: `C${i}`,
          email: `c${i}@x.co`,
          ipHash: null,
        }),
      ),
    );
    expect(results.filter((r) => r?.status === "confirmed")).toHaveLength(1);
    expect(results.filter((r) => r?.status === "waitlist")).toHaveLength(5);
  });

  it("counts recent RSVPs per ip hash", async () => {
    const eventId = await makeEvent({ capacity: null });
    const ipHash = `${stamp}-ip`;
    await insertRsvp(sql, { eventId, name: "A", email: "ip1@x.co", ipHash });
    await insertRsvp(sql, { eventId, name: "B", email: "ip2@x.co", ipHash });
    expect(await countRecentByIp(sql, ipHash)).toBe(2);
  });

  it("changes status only for the matching event", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const otherId = await makeEvent({ capacity: 1 });
    await insertRsvp(sql, { eventId, name: "A", email: "s@x.co", ipHash: null });
    const [{ id }] = (await sql`select id from rsvps where event_id = ${eventId}`) as { id: string }[];
    expect(await setRsvpStatus(sql, { eventId: otherId, rsvpId: id, status: "cancelled" })).toBeNull();
    let rows = (await sql`select status from rsvps where id = ${id}`) as { status: string }[];
    expect(rows[0].status).toBe("confirmed");
    expect(await setRsvpStatus(sql, { eventId, rsvpId: id, status: "cancelled" })).toMatchObject({
      previous: "confirmed",
    });
    rows = (await sql`select status from rsvps where id = ${id}`) as { status: string }[];
    expect(rows[0].status).toBe("cancelled");
  });

  it("reports whether setEventCapacity updated a row", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    expect(await setEventCapacity(sql, eventId, 5)).toBe(true);
    const rows = (await sql`select capacity from events where id = ${eventId}`) as { capacity: number }[];
    expect(rows[0].capacity).toBe(5);
    expect(await setEventCapacity(sql, randomUUID(), 5)).toBe(false);
  });

  it("returns a cancel token from insertRsvp and setRsvpStatus", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const result = await insertRsvp(sql, { eventId, name: "A", email: "tok@x.co", ipHash: null });
    expect(result?.cancelToken).toMatch(/^[0-9a-f-]{36}$/);
    const [{ id }] = (await sql`select id from rsvps where event_id = ${eventId}`) as { id: string }[];
    const change = await setRsvpStatus(sql, { eventId, rsvpId: id, status: "waitlist" });
    expect(change?.cancelToken).toBe(result?.cancelToken);
  });

  it("cancels by token and promotes the oldest waitlisted guest", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const a = await insertRsvp(sql, { eventId, name: "A", email: "c1@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "B", email: "c2@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "C", email: "c3@x.co", ipHash: null });

    const out = await cancelRsvpByToken(sql, a!.cancelToken);
    expect(out).toMatchObject({ outcome: "cancelled", eventId, promoted: { name: "B", email: "c2@x.co" } });

    const rows = (await sql`select name, status from rsvps where event_id = ${eventId} order by name`) as {
      name: string;
      status: string;
    }[];
    expect(rows.map((r) => `${r.name}:${r.status}`)).toEqual(["A:cancelled", "B:confirmed", "C:waitlist"]);
    expect(await cancelRsvpByToken(sql, a!.cancelToken)).toEqual({ outcome: "already" });
  });

  it("a waitlisted guest leaving promotes nobody", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    await insertRsvp(sql, { eventId, name: "A", email: "w1@x.co", ipHash: null });
    const b = await insertRsvp(sql, { eventId, name: "B", email: "w2@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "C", email: "w3@x.co", ipHash: null });
    expect(await cancelRsvpByToken(sql, b!.cancelToken)).toMatchObject({ outcome: "cancelled", promoted: null });
  });

  it("refuses unknown tokens and past events", async () => {
    expect(await cancelRsvpByToken(sql, randomUUID())).toEqual({ outcome: "invalid" });
    const eventId = await makeEvent({ capacity: null });
    const a = await insertRsvp(sql, { eventId, name: "A", email: "p@x.co", ipHash: null });
    await sql`update events set event_date = ${past} where id = ${eventId}`;
    expect(await cancelRsvpByToken(sql, a!.cancelToken)).toEqual({ outcome: "past" });
    expect(await getRsvpByCancelToken(sql, a!.cancelToken)).toMatchObject({ name: "A", status: "confirmed", eventId });
  });

  it("claims each reminder once, by Puerto Rico date", async () => {
    // 6:30 PM AST on 2030-03-10. "now" is passed in, so no real event matches.
    const eventId = await makeEvent({ capacity: null, date: "2030-03-10T22:30:00Z" });
    await insertRsvp(sql, { eventId, name: "A", email: "r1@x.co", ipHash: null });
    const dayBefore = new Date("2030-03-09T14:00:00Z");
    const dayOf = new Date("2030-03-10T14:00:00Z");

    expect(await claimNextReminder(sql, "final", dayBefore)).toBeNull();
    const first = await claimNextReminder(sql, "reminder", dayBefore);
    expect(first).toMatchObject({ eventId, name: "A", email: "r1@x.co" });
    expect(await claimNextReminder(sql, "reminder", dayBefore)).toBeNull();

    await releaseReminder(sql, "reminder", first!.id);
    expect(await claimNextReminder(sql, "reminder", dayBefore)).toMatchObject({ id: first!.id });

    expect(await claimNextReminder(sql, "final", dayOf)).toMatchObject({ id: first!.id });
    expect(await claimNextReminder(sql, "final", new Date("2030-03-10T23:00:00Z"))).toBeNull();
  });
});
