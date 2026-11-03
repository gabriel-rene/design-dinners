import { describe, expect, it } from "vitest";

import { countByTag, MAX_TAGS, parseTags, tagSlug } from "./member-tags";

describe("tagSlug", () => {
  it("drops accents, case and odd characters", () => {
    expect(tagSlug("  Comité Organizador ")).toBe("comite-organizador");
    expect(tagSlug("UX/UI")).toBe("ux-ui");
    expect(tagSlug("¡!")).toBe("");
  });

  it("caps the length without a trailing dash", () => {
    expect(tagSlug("a".repeat(29) + " b c")).toBe("a".repeat(29));
  });
});

describe("parseTags", () => {
  it("splits on commas, skips blanks and repeats", () => {
    expect(parseTags("comite, Organizador,, Comité ,")).toEqual({ value: ["comite", "organizador"] });
    expect(parseTags("")).toEqual({ value: [] });
  });

  it("rejects too many tags", () => {
    const many = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`).join(",");
    expect(parseTags(many)).toHaveProperty("error");
  });
});

describe("countByTag", () => {
  it("counts and sorts biggest first, then A–Z", () => {
    expect(countByTag([{ tags: ["organizador", "comite"] }, { tags: ["comite"] }, { tags: [] }, { tags: ["amigo"] }])).toEqual([
      { tag: "comite", count: 2 },
      { tag: "amigo", count: 1 },
      { tag: "organizador", count: 1 },
    ]);
  });
});
