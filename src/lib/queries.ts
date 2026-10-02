import { DEMO_EVENTS, DEMO_SPEAKERS } from "./demo-data";
import { getDb, hasDatabaseConfig } from "./db";
import { isUuid } from "./rsvp";
import type { EventCounts, EventRow, EventWithSpeakers, RsvpRow, SpeakerRow } from "./types";

type JoinedEventRow = EventRow &
  EventCounts & {
    speakers: SpeakerRow[] | null;
  };

export async function getEventsWithSpeakers(): Promise<EventWithSpeakers[]> {
  if (!hasDatabaseConfig) {
    return DEMO_EVENTS;
  }

  const sql = getDb();
  const rows = await sql`
    select
      e.*,
      (select count(*)::int from rsvps r where r.event_id = e.id and r.status = 'confirmed') as confirmed_count,
      (select count(*)::int from rsvps r where r.event_id = e.id and r.status = 'waitlist') as waitlist_count,
      coalesce(
        jsonb_agg(
          to_jsonb(s.*)
          order by s.name
        ) filter (where s.id is not null),
        '[]'::jsonb
      ) as speakers
    from events e
    left join event_speakers es on es.event_id = e.id
    left join speakers s on s.id = es.speaker_id
    group by e.id
    order by e.event_date asc
  `;

  return (rows as JoinedEventRow[]).map((row) => ({
    ...row,
    speakers: row.speakers ?? [],
  }));
}

export async function getPublicEvent(id: string): Promise<EventWithSpeakers | null> {
  if (!hasDatabaseConfig) {
    return DEMO_EVENTS.find((event) => event.id === id) ?? null;
  }
  if (!isUuid(id)) return null;

  const sql = getDb();
  const rows = await sql`
    select
      e.*,
      (select count(*)::int from rsvps r where r.event_id = e.id and r.status = 'confirmed') as confirmed_count,
      (select count(*)::int from rsvps r where r.event_id = e.id and r.status = 'waitlist') as waitlist_count,
      coalesce(
        jsonb_agg(to_jsonb(s.*) order by s.name) filter (where s.id is not null),
        '[]'::jsonb
      ) as speakers
    from events e
    left join event_speakers es on es.event_id = e.id
    left join speakers s on s.id = es.speaker_id
    where e.id = ${id}
    group by e.id
    limit 1
  `;
  const row = rows[0] as JoinedEventRow | undefined;
  return row ? { ...row, speakers: row.speakers ?? [] } : null;
}

export async function getEventRsvps(eventId: string): Promise<RsvpRow[]> {
  if (!hasDatabaseConfig || !isUuid(eventId)) return [];
  const sql = getDb();
  return (await sql`
    select id, event_id, name, email, status, created_at, updated_at
    from rsvps
    where event_id = ${eventId}
    order by updated_at asc
  `) as RsvpRow[];
}

export async function getSpeakers(): Promise<SpeakerRow[]> {
  if (!hasDatabaseConfig) {
    return DEMO_SPEAKERS;
  }

  const sql = getDb();
  return (await sql`select * from speakers order by name asc`) as SpeakerRow[];
}

export async function getEventById(
  id: string,
): Promise<(EventRow & { speaker_ids: string[] }) | null> {
  if (!hasDatabaseConfig) {
    return null;
  }
  if (!isUuid(id)) return null;

  const sql = getDb();
  const rows = await sql`
    select
      e.*,
      coalesce(
        array_agg(es.speaker_id::text)
          filter (where es.speaker_id is not null),
        array[]::text[]
      ) as speaker_ids
    from events e
    left join event_speakers es on es.event_id = e.id
    where e.id = ${id}
    group by e.id
    limit 1
  `;

  return (rows[0] as (EventRow & { speaker_ids: string[] }) | undefined) ?? null;
}

export async function getSpeakerById(id: string): Promise<SpeakerRow | null> {
  if (!hasDatabaseConfig) {
    return null;
  }

  const sql = getDb();
  const rows = await sql`select * from speakers where id = ${id} limit 1`;
  return (rows[0] as SpeakerRow | undefined) ?? null;
}
