// Server-only DB writes for RSVPs. Every function takes `sql` so tests can
// pass their own client.
import type { Sql } from "./db";
import type { RsvpStatus } from "./types";

type InsertInput = { eventId: string; name: string; email: string; ipHash: string | null };
type InsertResult = { status: "confirmed" | "waitlist"; position: number; cancelToken: string };

/**
 * Inserts one RSVP. A per-event advisory lock serializes concurrent RSVPs, and
 * the insert runs as a separate statement after the lock, so under READ
 * COMMITTED its confirmed-count sees every earlier commit: seats are never
 * overbooked. Returns null for a duplicate email or a closed / external /
 * missing event. The lock key is the canonical uuid text, so differently-cased
 * ids of one event share a lock. `position` is the seat number (confirmed) or
 * the place in line (waitlist); the CTE's subquery cannot see the new row, hence `+ 1`.
 */
export async function insertRsvp(sql: Sql, input: InsertInput): Promise<InsertResult | null> {
  const { eventId, name, email, ipHash } = input;
  const results = await sql.transaction((txn) => [
    // Canonical uuid text: the id may arrive in any letter case.
    txn`select pg_advisory_xact_lock(hashtext(${eventId}::uuid::text))`,
    txn`
      with ins as (
        insert into rsvps (event_id, name, email, status, ip_hash)
        select
          e.id, ${name}, ${email},
          case
            when e.capacity is null
              or (select count(*) from rsvps r where r.event_id = e.id and r.status = 'confirmed') < e.capacity
            then 'confirmed'
            else 'waitlist'
          end,
          ${ipHash}
        from events e
        where e.id = ${eventId}
          and e.event_date >= now()
          and e.registration_url is null
        on conflict (event_id, lower(email)) do nothing
        returning status, cancel_token
      )
      select
        ins.status,
        ins.cancel_token::text as "cancelToken",
        (select count(*)::int from rsvps r where r.event_id = ${eventId} and r.status = ins.status) + 1 as position
      from ins
    `,
  ]);
  const rows = results[1] as unknown as InsertResult[];
  return rows[0] ?? null;
}

export async function isEventOpenForRsvp(sql: Sql, eventId: string): Promise<boolean> {
  const rows = await sql`
    select 1 from events
    where id = ${eventId} and event_date >= now() and registration_url is null
  `;
  return rows.length > 0;
}

export async function countRecentByIp(sql: Sql, ipHash: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as n from rsvps
    where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export type RsvpStatusChange = { previous: RsvpStatus; name: string; email: string; cancelToken: string };

/** Returns the status before the change plus the guest, or null when no RSVP
 *  matched. The row lock makes `previous` exact even if two admins click at once. */
export async function setRsvpStatus(
  sql: Sql,
  input: { eventId: string; rsvpId: string; status: RsvpStatus },
): Promise<RsvpStatusChange | null> {
  const rows = (await sql`
    with prev as (
      select id, status from rsvps
      where id = ${input.rsvpId} and event_id = ${input.eventId}
      for update
    )
    update rsvps r set status = ${input.status}, updated_at = now()
    from prev
    where r.id = prev.id
    returning prev.status as previous, r.name, r.email, r.cancel_token::text as "cancelToken"
  `) as RsvpStatusChange[];
  return rows[0] ?? null;
}

/** Returns false when no event has that id. */
export async function setEventCapacity(sql: Sql, eventId: string, capacity: number | null): Promise<boolean> {
  const rows = (await sql`update events set capacity = ${capacity} where id = ${eventId} returning id`) as { id: string }[];
  return rows.length > 0;
}

export type ReminderKind = "reminder" | "final";
export type ReminderTarget = { id: string; eventId: string; name: string; email: string; cancelToken: string };
export type CancelLookup = {
  name: string;
  status: RsvpStatus;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  location: string | null;
};
type Guest = { name: string; email: string; cancelToken: string };
export type CancelOutcome =
  | { outcome: "cancelled"; eventId: string; promoted: Guest | null }
  | { outcome: "already" | "past" | "invalid" };

export async function getRsvpByCancelToken(sql: Sql, token: string): Promise<CancelLookup | null> {
  const rows = (await sql`
    select r.name, r.status, e.id as "eventId", e.title as "eventTitle",
           e.event_date as "eventDate", e.location
    from rsvps r join events e on e.id = r.event_id
    where r.cancel_token = ${token}
  `) as CancelLookup[];
  const row = rows[0];
  return row ? { ...row, eventDate: new Date(row.eventDate).toISOString() } : null;
}

/**
 * Guest self-cancel. Under the event's advisory lock (same key as insertRsvp):
 * cancel the RSVP and, when it held a seat, hand that seat to the oldest
 * waitlisted guest if the table now has room. Data-modifying CTEs all read the
 * pre-statement snapshot, hence `count - 1` for the freed seat.
 */
export async function cancelRsvpByToken(sql: Sql, token: string): Promise<CancelOutcome> {
  const found = await getRsvpByCancelToken(sql, token);
  if (!found) return { outcome: "invalid" };
  if (found.status === "cancelled") return { outcome: "already" };
  if (new Date(found.eventDate).getTime() < Date.now()) return { outcome: "past" };

  const results = await sql.transaction((txn) => [
    txn`select pg_advisory_xact_lock(hashtext(${found.eventId}::uuid::text))`,
    txn`
      with target as (
        select id, status from rsvps where cancel_token = ${token} for update
      ),
      cancelled as (
        update rsvps r set status = 'cancelled', updated_at = now()
        from target
        where r.id = target.id and target.status in ('confirmed', 'waitlist')
        returning target.status as previous
      ),
      next as (
        select w.id from rsvps w
        join events e on e.id = w.event_id
        where w.event_id = ${found.eventId}
          and w.status = 'waitlist'
          and w.cancel_token <> ${token}
          and exists (select 1 from cancelled where previous = 'confirmed')
          and (
            e.capacity is null
            or (select count(*) from rsvps c where c.event_id = e.id and c.status = 'confirmed') - 1 < e.capacity
          )
        order by w.created_at
        limit 1
        for update of w
      ),
      promoted as (
        update rsvps r set status = 'confirmed', updated_at = now()
        from next where r.id = next.id
        returning r.name, r.email, r.cancel_token::text as "cancelToken"
      )
      select
        (select previous from cancelled) as previous,
        (select row_to_json(p) from promoted p) as promoted
    `,
  ]);
  const row = (results[1] as unknown as { previous: string | null; promoted: Guest | null }[])[0];
  if (!row?.previous) return { outcome: "already" };
  return { outcome: "cancelled", eventId: found.eventId, promoted: row.promoted ?? null };
}

/**
 * Marks and returns one confirmed guest who still needs this reminder, or null.
 * "reminder" = event on the Puerto Rico calendar day after `now`;
 * "final" = event on the same PR day as `now` that has not started yet.
 * SKIP LOCKED: two overlapping runs never claim the same guest.
 */
export async function claimNextReminder(sql: Sql, kind: ReminderKind, now: Date): Promise<ReminderTarget | null> {
  const at = now.toISOString();
  const rows = (
    kind === "reminder"
      ? await sql`
          update rsvps set reminder_sent_at = now()
          where id = (
            select r.id from rsvps r join events e on e.id = r.event_id
            where r.status = 'confirmed' and r.reminder_sent_at is null
              and (e.event_date at time zone 'America/Puerto_Rico')::date
                = (${at}::timestamptz at time zone 'America/Puerto_Rico')::date + 1
            order by r.created_at limit 1
            for update of r skip locked
          )
          returning id, event_id as "eventId", name, email, cancel_token::text as "cancelToken"
        `
      : await sql`
          update rsvps set final_reminder_sent_at = now()
          where id = (
            select r.id from rsvps r join events e on e.id = r.event_id
            where r.status = 'confirmed' and r.final_reminder_sent_at is null
              and (e.event_date at time zone 'America/Puerto_Rico')::date
                = (${at}::timestamptz at time zone 'America/Puerto_Rico')::date
              and e.event_date > ${at}::timestamptz
            order by r.created_at limit 1
            for update of r skip locked
          )
          returning id, event_id as "eventId", name, email, cancel_token::text as "cancelToken"
        `
  ) as ReminderTarget[];
  return rows[0] ?? null;
}

/** Undoes a claim after a failed send, so the next run retries that guest. */
export async function releaseReminder(sql: Sql, kind: ReminderKind, rsvpId: string): Promise<void> {
  if (kind === "reminder") await sql`update rsvps set reminder_sent_at = null where id = ${rsvpId}`;
  else await sql`update rsvps set final_reminder_sent_at = null where id = ${rsvpId}`;
}
