import { describe, expect, it } from "vitest";

import { parseLang, parsePulsoInput, pulsoRawFromFormData, type PulsoRaw } from "./validate";

const good: PulsoRaw = {
  name: "  Ana Rivera ",
  email: " Ana@Ejemplo.com ",
  organization: "",
  roles: ["auspicio"],
  message: "",
  consent: true,
  lang: "en",
};

describe("parsePulsoInput", () => {
  it("trims, lowercases the email and turns empty optionals into null", () => {
    expect(parsePulsoInput(good)).toEqual({
      ok: true,
      value: { name: "Ana Rivera", email: "ana@ejemplo.com", organization: null, roles: ["auspicio"], message: null, lang: "en" },
    });
  });

  it("flags every missing required field at once", () => {
    const result = parsePulsoInput({ ...good, name: " ", email: "", roles: [], consent: false });
    expect(result).toEqual({ ok: false, errors: { name: "required", email: "required", roles: "required", consent: "required" } });
  });

  it("rejects a bad email", () => {
    expect(parsePulsoInput({ ...good, email: "ana@ejemplo" })).toEqual({ ok: false, errors: { email: "invalid" } });
  });

  it("drops unknown roles and repeats", () => {
    const result = parsePulsoInput({ ...good, roles: ["hack", "academia", "academia", "encuesta"] });
    expect(result.ok && result.value.roles).toEqual(["academia", "encuesta"]);
    expect(parsePulsoInput({ ...good, roles: ["hack"] })).toEqual({ ok: false, errors: { roles: "required" } });
  });

  it("caps text lengths", () => {
    const result = parsePulsoInput({ ...good, name: "a".repeat(121), organization: "o".repeat(161), message: "m".repeat(2001) });
    expect(result).toEqual({ ok: false, errors: { name: "tooLong", organization: "tooLong", message: "tooLong" } });
  });
});

describe("parseLang", () => {
  it("only accepts en; anything else is es", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("fr")).toBe("es");
    expect(parseLang(undefined)).toBe("es");
  });
});

describe("pulsoRawFromFormData", () => {
  it("reads every role and the consent box", () => {
    const form = new FormData();
    form.set("name", "Ana");
    form.append("role", "metodo");
    form.append("role", "difusion");
    form.set("consent", "on");
    expect(pulsoRawFromFormData(form)).toMatchObject({ name: "Ana", roles: ["metodo", "difusion"], consent: true, lang: "" });
  });
});
