// Server-only: this module creates a cookie-bound Supabase client (see
// `./supabase/server`, which depends on `next/headers`). Import it only from
// Server Components, Server Actions, or Route Handlers — never from Client
// Components.

import { createClient } from "./supabase/server";
import type { EventRow, EventWithSpeakers, ResourceRow, SpeakerRow } from "./types";

type EventWithJoinedSpeakers = EventRow & {
  event_speakers: { speaker_id: string; speakers: SpeakerRow | null }[] | null;
};

export async function getEventsWithSpeakers(): Promise<EventWithSpeakers[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*, event_speakers(speaker_id, speakers(*))")
    .order("event_date", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as EventWithJoinedSpeakers[]).map(({ event_speakers, ...event }) => {
    const speakers = (event_speakers ?? [])
      .map((join) => join.speakers)
      .filter((speaker): speaker is SpeakerRow => speaker !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { ...event, speakers };
  });
}

export async function getSpeakers(): Promise<SpeakerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("speakers").select("*").order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as SpeakerRow[];
}

export async function getResources(): Promise<ResourceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ResourceRow[];
}
