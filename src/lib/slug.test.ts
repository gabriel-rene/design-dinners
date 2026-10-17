import { describe, expect, it } from "vitest";
import {
  RESERVED_SLUGS,
  communityEventPath,
  eventPath,
  slugify,
  uniqueSlug,
} from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("De Mad Men a la era del meme")).toBe(
      "de-mad-men-a-la-era-del-meme",
    );
  });
  it("strips accents and punctuation", () => {
    expect(slugify("Diseño & Café: ¿Qué sigue?")).toBe("diseno-cafe-que-sigue");
  });
  it("trims hyphens", () => {
    expect(slugify("  --Hola--  ")).toBe("hola");
  });
  it("falls back to evento", () => {
    expect(slugify("🎨🍟")).toBe("evento");
  });
  it("caps at 80 chars with no trailing hyphen", () => {
    const s = slugify("palabra ".repeat(15));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
    const long = slugify("a".repeat(120));
    expect(long.length).toBeLessThanOrEqual(80);
  });
});

describe("uniqueSlug", () => {
  it("returns base when free", () => {
    expect(uniqueSlug("cena", [])).toBe("cena");
  });
  it("increments", () => {
    expect(uniqueSlug("cena", ["cena", "cena-2"])).toBe("cena-3");
  });
  it("avoids reserved", () => {
    expect(RESERVED_SLUGS).toEqual(["enviar", "comunidad"]);
    expect(uniqueSlug("enviar", [])).toBe("enviar-2");
    expect(uniqueSlug("comunidad", [])).toBe("comunidad-2");
  });
});

describe("paths", () => {
  it("eventPath", () => {
    expect(eventPath({ id: "u", slug: null })).toBe("/eventos/u");
    expect(eventPath({ id: "u", slug: "mi-cena" })).toBe("/eventos/mi-cena");
  });
  it("communityEventPath", () => {
    expect(communityEventPath({ slug: "x" })).toBe("/eventos/comunidad/x");
  });
});
