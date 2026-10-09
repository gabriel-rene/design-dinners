// Server-only DB writes for RSVPs. Every function takes `sql` so tests can
// pass their own client.
import type { Sql } from "./db";
import type { RsvpStatus } from "./types";

type InsertInput = { eventId: string; name: string; email: string; ipHash: string | null };
type InsertResult = { status: "confirmed" | "waitlist"; position: number };

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
        returning status
      )
      select
        ins.status,
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

export type RsvpStatusChange = { previous: RsvpStatus; name: string; email: string };

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
    returning prev.status as previous, r.name, r.email
  `) as RsvpStatusChange[];
  return rows[0] ?? null;
}

/** Returns false when no event has that id. */
export async function setEventCapacity(sql: Sql, eventId: string, capacity: number | null): Promise<boolean> {
  const rows = (await sql`update events set capacity = ${capacity} where id = ${eventId} returning id`) as { id: string }[];
  return rows.length > 0;
}
