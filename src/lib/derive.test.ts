import { describe, expect, it } from "vitest";
import { groupResources, isUpcoming, speakerStatus, splitEvents } from "./derive";
import type { EventWithSpeakers, ResourceRow, SpeakerRow } from "./types";

const NOW = new Date("2026-07-14T12:00:00Z");

function makeEvent(
  overrides: Partial<EventWithSpeakers> & { event_date: string },
): EventWithSpeakers {
  return {
    id: overrides.id ?? "event-id",
    title: overrides.title ?? "Cena de diseño",
    description: overrides.description ?? null,
    event_date: overrides.event_date,
    location: overrides.location ?? null,
    event_type: overrides.event_type ?? "cena",
    registration_url: overrides.registration_url ?? null,
    cover_image_url: overrides.cover_image_url ?? null,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    speakers: overrides.speakers ?? [],
  };
}

function makeSpeaker(overrides: Partial<SpeakerRow> & { id: string }): SpeakerRow {
  return {
    id: overrides.id,
    name: overrides.name ?? "Speaker",
    role_title: overrides.role_title ?? null,
    bio: overrides.bio ?? null,
    photo_url: overrides.photo_url ?? null,
    social_links: overrides.social_links ?? [],
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  };
}

function makeResource(overrides: Partial<ResourceRow> & { id: string }): ResourceRow {
  return {
    id: overrides.id,
    title: overrides.title ?? "Recurso",
    description: overrides.description ?? null,
    url: overrides.url ?? "https://example.com",
    category: overrides.category ?? "General",
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  };
}

describe("isUpcoming", () => {
  it("returns true for an event dated tomorrow", () => {
    expect(isUpcoming({ event_date: "2026-07-15T12:00:00Z" }, NOW)).toBe(true);
  });

  it("returns false for an event dated yesterday", () => {
    expect(isUpcoming({ event_date: "2026-07-13T12:00:00Z" }, NOW)).toBe(false);
  });
});

describe("splitEvents", () => {
  it("orders upcoming soonest-first and past most-recent-first", () => {
    const soon = makeEvent({ id: "soon", event_date: "2026-07-16T00:00:00Z" });
    const later = makeEvent({ id: "later", event_date: "2026-07-20T00:00:00Z" });
    const recentPast = makeEvent({ id: "recent-past", event_date: "2026-07-13T00:00:00Z" });
    const olderPast = makeEvent({ id: "older-past", event_date: "2026-07-01T00:00:00Z" });

    const { upcoming, past } = splitEvents(
      [later, olderPast, soon, recentPast],
      NOW,
    );

    expect(upcoming.map((e) => e.id)).toEqual(["soon", "later"]);
    expect(past.map((e) => e.id)).toEqual(["recent-past", "older-past"]);
  });
});

describe("speakerStatus", () => {
  it("returns 'upcoming' when the speaker has only a future event", () => {
    const speaker = makeSpeaker({ id: "sp-1" });
    const events: EventWithSpeakers[] = [
      makeEvent({ id: "e1", event_date: "2026-08-01T00:00:00Z", speakers: [speaker] }),
    ];

    expect(speakerStatus("sp-1", events, NOW)).toBe("upcoming");
  });

  it("returns 'past' when the speaker has one past and one future event", () => {
    const speaker = makeSpeaker({ id: "sp-2" });
    const events: EventWithSpeakers[] = [
      makeEvent({ id: "e1", event_date: "2026-06-01T00:00:00Z", speakers: [speaker] }),
      makeEvent({ id: "e2", event_date: "2026-08-01T00:00:00Z", speakers: [] }),
    ];

    expect(speakerStatus("sp-2", events, NOW)).toBe("past");
  });

  it("returns 'upcoming' when the speaker has no events", () => {
    const events: EventWithSpeakers[] = [
      makeEvent({ id: "e1", event_date: "2026-08-01T00:00:00Z", speakers: [] }),
    ];

    expect(speakerStatus("sp-missing", events, NOW)).toBe("upcoming");
  });
});

describe("groupResources", () => {
  it("groups by category alphabetically with items ordered by created_at desc", () => {
    const resources: ResourceRow[] = [
      makeResource({ id: "r1", category: "Tipografía", created_at: "2026-01-01T00:00:00Z" }),
      makeResource({ id: "r2", category: "Color", created_at: "2026-03-01T00:00:00Z" }),
      makeResource({ id: "r3", category: "Color", created_at: "2026-05-01T00:00:00Z" }),
    ];

    const grouped = groupResources(resources);

    expect([...grouped.keys()]).toEqual(["Color", "Tipografía"]);
    expect(grouped.get("Color")!.map((r) => r.id)).toEqual(["r3", "r2"]);
    expect(grouped.get("Tipografía")!.map((r) => r.id)).toEqual(["r1"]);
  });
});
