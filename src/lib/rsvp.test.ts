import { describe, expect, it } from "vitest";

import {
  buildRsvpCsv,
  isHoneypotFilled,
  isUuid,
  parseCapacity,
  parseRsvpInput,
  plateRows,
  rsvpMode,
  seatsLeft,
} from "./rsvp";

const NOW = new Date("2026-10-10T12:00:00Z");
const FUTURE = "2026-10-23T23:00:00Z";
const PAST = "2026-09-01T23:00:00Z";

describe("isUuid", () => {
  it("accepts a uuid and rejects junk", () => {
    expect(isUuid("3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f")).toBe(true);
    expect(isUuid("demo-event-upcoming")).toBe(false);
    expect(isUuid("'; drop table events")).toBe(false);
  });
});

describe("parseRsvpInput", () => {
  it("trims and collapses spaces in the name, trims the email", () => {
    expect(parseRsvpInput({ name: "  Gabriela   Ortiz ", email: " g@ejemplo.com " })).toEqual({
      ok: true,
      name: "Gabriela Ortiz",
      email: "g@ejemplo.com",
    });
  });

  it("returns Spanish field errors", () => {
    const result = parseRsvpInput({ name: "  ", email: "gabriela@correo" });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Escribe tu nombre.",
        email: "A ese correo le falta algo. Revisa que termine en algo como .com",
      },
    });
  });

  it("rejects an empty email and a too-long name", () => {
    const result = parseRsvpInput({ name: "a".repeat(121), email: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBe("Ese nombre es muy largo. Usa 120 letras o menos.");
      expect(result.errors.email).toBe("Escribe tu correo.");
    }
  });
});

describe("isHoneypotFilled", () => {
  it("is true only when the hidden field has text", () => {
    expect(isHoneypotFilled(null)).toBe(false);
    expect(isHoneypotFilled("   ")).toBe(false);
    expect(isHoneypotFilled("http://spam")).toBe(true);
  });
});

describe("rsvpMode", () => {
  const base = { event_date: FUTURE, registration_url: null, capacity: 20, confirmed_count: 5 };

  it("is closed for past events, even with an external link", () => {
    expect(rsvpMode({ ...base, event_date: PAST, registration_url: "https://x.com" }, NOW)).toBe("closed");
  });
  it("is external when a registration link is set", () => {
    expect(rsvpMode({ ...base, registration_url: "https://x.com" }, NOW)).toBe("external");
  });
  it("is full at capacity and open below it", () => {
    expect(rsvpMode({ ...base, confirmed_count: 20 }, NOW)).toBe("full");
    expect(rsvpMode(base, NOW)).toBe("open");
  });
  it("is open with no capacity", () => {
    expect(rsvpMode({ ...base, capacity: null, confirmed_count: 999 }, NOW)).toBe("open");
  });
});

describe("seatsLeft", () => {
  it("is null without a limit and never negative", () => {
    expect(seatsLeft(null, 4)).toBeNull();
    expect(seatsLeft(20, 14)).toBe(6);
    expect(seatsLeft(20, 23)).toBe(0);
  });
});

describe("plateRows", () => {
  it("alternates seats between the two sides of the table", () => {
    expect(plateRows(5, 3)).toEqual({
      top: ["taken", "taken", "free"],
      bottom: ["taken", "free"],
    });
  });
  it("marks the visitor's seat", () => {
    expect(plateRows(4, 3, 2)).toEqual({ top: ["taken", "mine"], bottom: ["taken", "free"] });
  });
  it("returns null above the visual limit", () => {
    expect(plateRows(41, 3)).toBeNull();
  });
});

describe("parseCapacity", () => {
  it("treats empty as no limit", () => {
    expect(parseCapacity("")).toEqual({ value: null });
    expect(parseCapacity(null)).toEqual({ value: null });
  });
  it("accepts 1–1000 integers only", () => {
    expect(parseCapacity(" 20 ")).toEqual({ value: 20 });
    expect(parseCapacity("0")).toEqual({ error: "El cupo debe estar entre 1 y 1000." });
    expect(parseCapacity("1001")).toEqual({ error: "El cupo debe estar entre 1 y 1000." });
    expect(parseCapacity("2.5")).toEqual({ error: "El cupo debe ser un número entero." });
  });
});

describe("buildRsvpCsv", () => {
  it("writes a BOM, a header, quoted cells and guards formulas", () => {
    const csv = buildRsvpCsv([
      { name: '=HYPERLINK("x")', email: "a@b.co", status: "waitlist", created_at: "2026-10-02T13:14:00.000Z" },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe('"Nombre","Correo","Estado","Reservó (UTC)"');
    expect(lines[1]).toBe('"\'=HYPERLINK(""x"")","a@b.co","Lista de espera","2026-10-02T13:14:00.000Z"');
  });
});
