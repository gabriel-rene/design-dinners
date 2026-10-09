// Pure derivation logic — no Supabase imports, no network, no real clock reads.
// Every function that depends on "now" takes it as an optional injected parameter
// so behavior is fully deterministic in tests.

import type { EventWithSpeakers, SpeakerRow } from "./types";

export function isUpcoming(event: { event_date: string }, now: Date = new Date()): boolean {
  return new Date(event.event_date).getTime() >= now.getTime();
}

export function splitEvents<T extends { event_date: string }>(
  events: T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const event of events) {
    if (isUpcoming(event, now)) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  upcoming.sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );
  past.sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
  );

  return { upcoming, past };
}

export function speakerStatus(
  speakerId: string,
  events: EventWithSpeakers[],
  now: Date = new Date(),
): "past" | "upcoming" {
  const speakerEvents = events.filter((event) =>
    event.speakers.some((speaker) => speaker.id === speakerId),
  );

  const hasPastEvent = speakerEvents.some((event) => !isUpcoming(event, now));

  return hasPastEvent ? "past" : "upcoming";
}

/**
 * Spotlight speakers (spotlight_label set) of upcoming events, each paired
 * with their soonest upcoming event. One entry per speaker, soonest first.
 */
export function upcomingSpotlights(
  events: EventWithSpeakers[],
  now: Date = new Date(),
): { speaker: SpeakerRow; event: EventWithSpeakers }[] {
  const picks = new Map<string, { speaker: SpeakerRow; event: EventWithSpeakers }>();
  for (const event of splitEvents(events, now).upcoming) {
    for (const speaker of event.speakers) {
      if (speaker.spotlight_label && !picks.has(speaker.id)) {
        picks.set(speaker.id, { speaker, event });
      }
    }
  }
  return [...picks.values()];
}
