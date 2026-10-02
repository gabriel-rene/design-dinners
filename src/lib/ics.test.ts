import { describe, expect, it } from "vitest";

import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      id: "3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f",
      title: "Cena de Bienvenida, vol. 1",
      description: "Una mesa larga; buena comida.\nTrae preguntas.",
      location: "Santurce, San Juan",
      event_date: "2026-10-23T23:00:00Z",
    },
    "https://designdinners.com/eventos/3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f",
    new Date("2026-10-02T12:00:00Z"),
  );
  const lines = ics.split("\r\n");

  it("is a valid VCALENDAR with one VEVENT", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("uses UTC times and a 2-hour default length", () => {
    expect(lines).toContain("DTSTART:20261023T230000Z");
    expect(lines).toContain("DTEND:20261024T010000Z");
    expect(lines).toContain("DTSTAMP:20261002T120000Z");
  });

  it("escapes commas, semicolons and newlines", () => {
    expect(ics).toContain("SUMMARY:Cena de Bienvenida\\, vol. 1");
    expect(ics).toContain("Una mesa larga\\; buena comida.\\nTrae preguntas.");
  });

  it("folds lines longer than 75 characters", () => {
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(75);
  });
});
