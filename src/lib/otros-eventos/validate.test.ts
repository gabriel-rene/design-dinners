import { describe, expect, it } from "vitest";

import { normalizeEventLink, parseEventFields, parseEventInput, prToday, toStartsAt } from "./validate";

const NOW = new Date("2026-10-14T16:00:00Z"); // 12:00 PM in PR
const good = {
  title: "  Charla de tipografía  ", date: "2026-10-20", time: "19:00", venue: "Morena Coffee, Santurce",
  link: "eventbrite.com/e/123", description: "", organizer: "", price: "", email: "ana@ejemplo.com", permission: "on",
};

describe("toStartsAt", () => {
  it("reads date + time as Puerto Rico time", () => {
    expect(toStartsAt("2026-10-20", "19:00")).toBe("2026-10-20T23:00:00.000Z");
  });
  it("keeps 23:30 on the same PR day (next day in UTC)", () => {
    expect(toStartsAt("2026-10-20", "23:30")).toBe("2026-10-21T03:30:00.000Z");
  });
  it("refuses malformed or impossible values", () => {
    expect(toStartsAt("2026-02-30", "19:00")).toBeNull();
    expect(toStartsAt("2026-10-20", "25:00")).toBeNull();
    expect(toStartsAt("20-10-2026", "19:00")).toBeNull();
  });
});

describe("prToday", () => {
  it("uses the PR calendar day", () => {
    expect(prToday(new Date("2026-10-15T02:00:00Z"))).toBe("2026-10-14"); // 10 PM in PR
  });
});

describe("normalizeEventLink", () => {
  it("adds https:// when missing", () => {
    expect(normalizeEventLink("eventbrite.com/e/123")).toBe("https://eventbrite.com/e/123");
  });
  it("refuses non-web schemes, credentials and bare words", () => {
    expect(normalizeEventLink("javascript:alert(1)")).toBeNull();
    expect(normalizeEventLink("https://instagram.com@evil.com")).toBeNull();
    expect(normalizeEventLink("hola")).toBeNull();
  });
});

describe("parseEventFields", () => {
  it("accepts a good event and trims text", () => {
    const result = parseEventFields(good, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Charla de tipografía", startsAt: "2026-10-20T23:00:00.000Z", venue: "Morena Coffee, Santurce",
        link: "https://eventbrite.com/e/123", description: null, organizer: null, price: null, email: "ana@ejemplo.com",
      },
    });
  });
  it("requires the fields and the permission box", () => {
    const result = parseEventFields({}, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["date", "email", "link", "permission", "time", "title", "venue"].sort(),
      );
    }
  });
  it("allows today but not yesterday, and not more than 365 days ahead", () => {
    expect(parseEventFields({ ...good, date: "2026-10-14", time: "08:00" }, NOW).ok).toBe(true);
    const past = parseEventFields({ ...good, date: "2026-10-13" }, NOW);
    expect(!past.ok && past.errors.date).toMatch(/ya pasó/);
    const far = parseEventFields({ ...good, date: "2027-10-15" }, NOW);
    expect(!far.ok && far.errors.date).toMatch(/un año/);
  });
  it("only takes free / paid / nothing for price", () => {
    expect(parseEventFields({ ...good, price: "free" }, NOW)).toMatchObject({ ok: true, value: { price: "free" } });
    expect(parseEventFields({ ...good, price: "gratis" }, NOW).ok).toBe(false);
  });
  it("enforces lengths", () => {
    const result = parseEventFields({ ...good, title: "x".repeat(101), description: "y".repeat(301) }, NOW);
    expect(!result.ok && result.errors.title).toBeTruthy();
    expect(!result.ok && result.errors.description).toBeTruthy();
  });
});

describe("parseEventInput", () => {
  it("needs a valid uploaded image", () => {
    const bad = parseEventInput({ ...good, imagePath: "x.png", imageWidth: "1080", imageHeight: "1350" }, NOW);
    expect(!bad.ok && bad.errors.image).toBe("Vuelve a subir la imagen.");
    const ok = parseEventInput(
      { ...good, imagePath: "0f8fad5b-d9cb-469f-a165-70867728950e.png", imageWidth: "1080", imageHeight: "1350" },
      NOW,
    );
    expect(ok).toMatchObject({ ok: true, value: { imageWidth: 1080, imageHeight: 1350 } });
  });
});
