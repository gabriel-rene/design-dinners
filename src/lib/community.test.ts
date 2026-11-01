import { describe, expect, it } from "vitest";

import { buildMembersCsv, countByDiscipline, hasJoinedCookie } from "./community";

describe("hasJoinedCookie", () => {
  it("finds the flag among other cookies", () => {
    expect(hasJoinedCookie("a=1; dd_wa=1; b=2")).toBe(true);
    expect(hasJoinedCookie("dd_wa=1")).toBe(true);
  });

  it("ignores other values and look-alike names", () => {
    expect(hasJoinedCookie("")).toBe(false);
    expect(hasJoinedCookie("dd_wa=0")).toBe(false);
    expect(hasJoinedCookie("xdd_wa=1")).toBe(false);
  });
});

describe("buildMembersCsv", () => {
  it("writes a BOM, labels disciplines and guards formulas", () => {
    const csv = buildMembersCsv([
      { name: "=x", email: "a@b.co", discipline: "otra", discipline_other: "Sonido", created_at: "2026-10-31T13:00:00.000Z" },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe('"Nombre","Correo","Disciplina","Se unió (UTC)"');
    expect(lines[1]).toBe('"\'=x","a@b.co","Otra: Sonido","2026-10-31T13:00:00.000Z"');
  });
});

describe("countByDiscipline", () => {
  it("counts and sorts biggest first", () => {
    expect(
      countByDiscipline([{ discipline: "ux-ui" }, { discipline: "grafico" }, { discipline: "ux-ui" }]),
    ).toEqual([
      { discipline: "ux-ui", count: 2 },
      { discipline: "grafico", count: 1 },
    ]);
  });
});
