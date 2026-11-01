import { describe, expect, it } from "vitest";

import { DISCIPLINES, disciplineLabel, parseDisciplineInput } from "./disciplines";

describe("parseDisciplineInput", () => {
  it("accepts a listed discipline and drops the other text", () => {
    expect(parseDisciplineInput({ discipline: "ux-ui", disciplineOther: "ignorado" })).toEqual({
      ok: true,
      discipline: "ux-ui",
      disciplineOther: null,
    });
  });

  it("asks for a choice, and refuses values outside the list", () => {
    expect(parseDisciplineInput({ discipline: "", disciplineOther: "" })).toEqual({
      ok: false,
      errors: { discipline: "Escoge tu disciplina." },
    });
    expect(parseDisciplineInput({ discipline: "contabilidad", disciplineOther: "" })).toEqual({
      ok: false,
      errors: { discipline: "Escoge una disciplina de la lista." },
    });
  });

  it("needs the visitor's own words for Otra, trimmed and capped", () => {
    expect(parseDisciplineInput({ discipline: "otra", disciplineOther: "  Diseño   sonoro " })).toEqual({
      ok: true,
      discipline: "otra",
      disciplineOther: "Diseño sonoro",
    });
    expect(parseDisciplineInput({ discipline: "otra", disciplineOther: " " })).toEqual({
      ok: false,
      errors: { disciplineOther: "Cuéntanos cuál es tu disciplina." },
    });
    expect(parseDisciplineInput({ discipline: "otra", disciplineOther: "a".repeat(81) })).toEqual({
      ok: false,
      errors: { disciplineOther: "Usa 80 letras o menos." },
    });
  });
});

describe("parseDisciplineInput control characters", () => {
  it("refuses NUL and other control characters in Otra", () => {
    expect(parseDisciplineInput({ discipline: "otra", disciplineOther: "a\u0000b" })).toEqual({
      ok: false,
      errors: { disciplineOther: "Tiene caracteres que no se permiten." },
    });
  });
});

describe("disciplineLabel", () => {
  it("shows the label, the visitor's words for Otra, or blank for old rows", () => {
    expect(disciplineLabel("grafico", null)).toBe("Diseño gráfico");
    expect(disciplineLabel("otra", "Diseño sonoro")).toBe("Otra: Diseño sonoro");
    expect(disciplineLabel(null, null)).toBe("");
    expect(disciplineLabel("retirada", null)).toBe("retirada");
  });

  it("keeps every value unique and short enough for the DB", () => {
    const values = DISCIPLINES.map((d) => d.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => v.length <= 40)).toBe(true);
  });
});
