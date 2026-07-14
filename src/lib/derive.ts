// Pure derivation logic — no Supabase imports, no network, no real clock reads.
// Every function that depends on "now" takes it as an optional injected parameter
// so behavior is fully deterministic in tests.

import type { EventWithSpeakers, ResourceRow } from "./types";

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

export function groupResources(resources: ResourceRow[]): Map<string, ResourceRow[]> {
  const byCategory = new Map<string, ResourceRow[]>();

  for (const resource of resources) {
    const bucket = byCategory.get(resource.category);
    if (bucket) {
      bucket.push(resource);
    } else {
      byCategory.set(resource.category, [resource]);
    }
  }

  for (const bucket of byCategory.values()) {
    bucket.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  const sortedCategories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b));

  const result = new Map<string, ResourceRow[]>();
  for (const category of sortedCategories) {
    result.set(category, byCategory.get(category)!);
  }

  return result;
}
