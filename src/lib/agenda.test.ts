import { describe, expect, it } from "vitest";
import type { EventWithSpeakers } from "./types";
import type { PublicCommunityEvent } from "./otros-eventos/types";
import { agendaHref, buildAgenda, parseAgendaFilter } from "./agenda";

const dd = (id: string, iso: string) =>
  ({ id, event_date: iso }) as unknown as EventWithSpeakers;
const com = (id: string, iso: string) =>
  ({ id, startsAt: iso }) as unknown as PublicCommunityEvent;

const now = new Date("2026-10-01T00:00:00Z");
const ids = (rows: { event: { id: string } }[]) => rows.map((r) => r.event.id);

describe("parseAgendaFilter", () => {
  it.each([
    [undefined, "todos"],
    ["design-dinners", "design-dinners"],
    ["comunidad", "comunidad"],
    ["COMUNIDAD", "todos"],
    ["", "todos"],
    [["comunidad", "x"], "comunidad"],
    ["x", "todos"],
  ] as const)("%j -> %s", (raw, expected) => {
    expect(parseAgendaFilter(raw as string | string[] | undefined)).toBe(expected);
  });
});

describe("buildAgenda", () => {
  const input = {
    ddEvents: [dd("b", "2026-11-12T23:00:00Z")],
    communityEvents: [
      com("c2", "2026-10-24T03:30:00Z"),
      com("c1", "2026-10-19T23:00:00Z"),
    ],
    featuredId: null,
    now,
  };

  it("excludes the featured event", () => {
    const rows = buildAgenda({
      ddEvents: [dd("a", "2026-11-01T00:00:00Z"), dd("b", "2026-11-12T23:00:00Z")],
      communityEvents: [],
      featuredId: "a",
      filter: "todos",
      now,
    });
    expect(ids(rows)).toEqual(["b"]);
  });

  it("merges and sorts both kinds by start time", () => {
    const rows = buildAgenda({ ...input, filter: "todos" });
    expect(ids(rows)).toEqual(["c1", "c2", "b"]);
    expect(rows.map((r) => r.kind)).toEqual(["comunidad", "comunidad", "dd"]);
  });

  it("ties put Design Dinners first", () => {
    const rows = buildAgenda({
      ddEvents: [dd("d", "2026-10-20T00:00:00Z")],
      communityEvents: [com("c", "2026-10-20T00:00:00Z")],
      featuredId: null,
      filter: "todos",
      now,
    });
    expect(ids(rows)).toEqual(["d", "c"]);
  });

  it("filters", () => {
    expect(buildAgenda({ ...input, filter: "design-dinners" }).map((r) => r.kind)).toEqual(["dd"]);
    expect(ids(buildAgenda({ ...input, filter: "comunidad" }))).toEqual(["c1", "c2"]);
  });

  it("drops past Design Dinners events by time, keeps community as given", () => {
    const rows = buildAgenda({
      ddEvents: [dd("old", "2026-10-15T23:00:00Z")],
      communityEvents: [com("c", "2026-10-10T00:00:00Z")],
      featuredId: null,
      filter: "todos",
      now: new Date("2026-10-15T23:30:00Z"),
    });
    expect(ids(rows)).toEqual(["c"]);
  });

  it("handles empty inputs and null featuredId", () => {
    expect(
      buildAgenda({ ddEvents: [], communityEvents: [], featuredId: null, filter: "todos", now }),
    ).toEqual([]);
    expect(ids(buildAgenda({ ...input, filter: "design-dinners" }))).toEqual(["b"]);
  });
});

describe("agendaHref", () => {
  it("builds hrefs", () => {
    expect(agendaHref("todos")).toBe("/eventos");
    expect(agendaHref("design-dinners")).toBe("/eventos?tipo=design-dinners");
    expect(agendaHref("comunidad")).toBe("/eventos?tipo=comunidad");
  });
});
