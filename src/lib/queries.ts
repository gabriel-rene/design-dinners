// Public content reads. These use a cookie-less anonymous Supabase client (the
// public read policies grant `anon` select on every content table), NOT the
// cookie-bound server client. That distinction matters: reading cookies opts a
// route into dynamic rendering, which would force `/` to render per-request and
// make its `export const revalidate = false` inert. With no cookie access here
// `/` prerenders statically at build time, and the admin's `revalidatePath('/')`
// calls become the real update mechanism.
//
// Admin *writes* never go through this module — they use the session-bound
// client from `requireAdmin()`, which RLS checks against `is_admin()`.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventRow, EventWithSpeakers, ResourceRow, SpeakerRow } from "./types";

type EventWithJoinedSpeakers = EventRow & {
  event_speakers: { speaker_id: string; speakers: SpeakerRow | null }[] | null;
};

// Module-level singleton. No session, no cookies — safe to share across
// requests and cheap to keep around.
let anonClient: SupabaseClient | null = null;

function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    anonClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return anonClient;
}

export async function getEventsWithSpeakers(): Promise<EventWithSpeakers[]> {
  const supabase = getAnonClient();

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
  const supabase = getAnonClient();

  const { data, error } = await supabase.from("speakers").select("*").order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as SpeakerRow[];
}

export async function getResources(): Promise<ResourceRow[]> {
  const supabase = getAnonClient();

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ResourceRow[];
}

// --- Single-record reads (admin edit forms) -------------------------------
// Public read policies apply, so the anon client is fine here too; the edit
// pages gate on `requireAdmin()` for authorization, not on the read.

export async function getEventById(
  id: string,
): Promise<(EventRow & { speaker_ids: string[] }) | null> {
  const supabase = getAnonClient();

  const { data, error } = await supabase
    .from("events")
    .select("*, event_speakers(speaker_id)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const { event_speakers, ...event } = data as EventRow & {
    event_speakers: { speaker_id: string }[] | null;
  };
  const speaker_ids = (event_speakers ?? []).map((join) => join.speaker_id);

  return { ...event, speaker_ids };
}

export async function getSpeakerById(id: string): Promise<SpeakerRow | null> {
  const supabase = getAnonClient();

  const { data, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SpeakerRow | null) ?? null;
}

export async function getResourceById(id: string): Promise<ResourceRow | null> {
  const supabase = getAnonClient();

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ResourceRow | null) ?? null;
}
