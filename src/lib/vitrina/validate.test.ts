import { describe, expect, it } from "vitest";

import {
  checkImageFile,
  isPendingPath,
  mimeForPath,
  normalizeLink,
  parseFanId,
  parseWorkFields,
  parseWorkInput,
  workRawFromFormData,
} from "./validate";

const UUID = "3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f";

const good = {
  name: "  Ana   Rivera ",
  email: " ana@ejemplo.com ",
  role: "Ilustradora",
  title: "Coquí en neón",
  description: "Serie de carteles.\nHecha a mano.",
  badge: "open_to_work",
  ownership: "on",
  links: { website: "", instagram: "@ana.rivera", behance: "", linkedin: "", dribbble: "" },
};

describe("parseWorkFields", () => {
  it("cleans a valid submission", () => {
    expect(parseWorkFields(good)).toEqual({
      ok: true,
      value: {
        name: "Ana Rivera",
        email: "ana@ejemplo.com",
        role: "Ilustradora",
        title: "Coquí en neón",
        description: "Serie de carteles.\nHecha a mano.",
        badge: "open_to_work",
        links: { instagram: "https://www.instagram.com/ana.rivera/" },
      },
    });
  });

  it("returns Spanish errors for every missing required field", () => {
    const result = parseWorkFields({ links: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      name: "Escribe tu nombre.",
      email: "Escribe tu correo.",
      role: "Escribe tu rol o disciplina.",
      title: "Ponle un título a tu obra.",
      links: "Añade al menos un enlace para que la gente te encuentre.",
      ownership: "Confirma que la obra es tuya.",
    });
  });

  it("enforces lengths and badge values", () => {
    const result = parseWorkFields({
      ...good,
      title: "x".repeat(81),
      description: "x".repeat(301),
      role: "x".repeat(61),
      badge: "promo",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.title).toBe("Usa 80 letras o menos.");
    expect(result.errors.description).toBe("Usa 300 letras o menos.");
    expect(result.errors.role).toBe("Usa 60 letras o menos.");
    expect(result.errors.badge).toBe("Elige una opción de la lista.");
  });

  it("names the bad link", () => {
    const result = parseWorkFields({ ...good, links: { behance: "javascript:alert(1)" } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.links).toBe(
      "Revisa el enlace de Behance. Debe ser una dirección web, como https://tusitio.com",
    );
  });
});

describe("normalizeLink", () => {
  it("accepts urls, bare domains and instagram handles", () => {
    expect(normalizeLink("website", "https://ana.design/obra")).toBe("https://ana.design/obra");
    expect(normalizeLink("website", "ana.design")).toBe("https://ana.design/");
    expect(normalizeLink("instagram", "@ana_r")).toBe("https://www.instagram.com/ana_r/");
  });
  it("rejects unsafe or non-web links", () => {
    expect(normalizeLink("website", "javascript:alert(1)")).toBeNull();
    expect(normalizeLink("website", "localhost:3000")).toBeNull();
    expect(normalizeLink("website", "ftp://ana.design")).toBeNull();
    expect(normalizeLink("website", "nodot")).toBeNull();
  });
});

describe("normalizeLink hardening", () => {
  it("rejects credentials in the url", () => {
    expect(normalizeLink("website", "https://instagram.com@evil.com")).toBeNull();
    expect(normalizeLink("website", "https://user:pw@ana.design")).toBeNull();
  });
  it("caps the normalized url, not just the input", () => {
    const raw = `ana.design/${"é".repeat(120)}`;
    expect(raw.length).toBeLessThan(300);
    expect(normalizeLink("website", raw)).toBeNull();
  });
});

describe("description line endings", () => {
  it("normalizes CRLF before counting and storing", () => {
    const description = `${"x".repeat(149)}\r\n${"y".repeat(149)}`;
    expect(description.length).toBe(300);
    const result = parseWorkFields({ ...good, description });
    expect(result.ok && result.value.description).toBe(`${"x".repeat(149)}\n${"y".repeat(149)}`);
  });
  it("still rejects 301 characters after normalizing", () => {
    const result = parseWorkFields({ ...good, description: `${"x".repeat(150)}\r\n${"y".repeat(150)}` });
    expect(!result.ok && result.errors.description).toBe("Usa 300 letras o menos.");
  });
});

describe("parseWorkInput", () => {
  it("needs a pending path from us and real dimensions", () => {
    const ok = parseWorkInput({ ...good, imagePath: `${UUID}.jpg`, imageWidth: "1080", imageHeight: "1350" });
    expect(ok.ok && ok.value.imagePath).toBe(`${UUID}.jpg`);
    const bad = parseWorkInput({ ...good, imagePath: "../secret.jpg", imageWidth: "0", imageHeight: "1" });
    expect(!bad.ok && bad.errors.image).toBe("Vuelve a subir la imagen.");
  });
});

describe("image rules", () => {
  it("allows jpg/png/webp up to 4.5 MB, never svg", () => {
    expect(checkImageFile({ type: "image/jpeg", size: 4_718_592 })).toBeNull();
    expect(checkImageFile({ type: "image/jpeg", size: 4_718_593 })).toBe("La imagen no puede pesar más de 4.5 MB.");
    expect(checkImageFile({ type: "image/svg+xml", size: 10 })).toBe("La imagen debe ser JPG, PNG o WebP.");
    expect(checkImageFile({ type: "image/png", size: 0 })).toBe("Elige una imagen.");
  });
  it("recognizes our pending paths and their mime type", () => {
    expect(isPendingPath(`${UUID}.webp`)).toBe(true);
    expect(isPendingPath(`folder/${UUID}.webp`)).toBe(false);
    expect(isPendingPath(`${UUID}.svg`)).toBe(false);
    expect(mimeForPath(`${UUID}.png`)).toBe("image/png");
    expect(mimeForPath("x.gif")).toBeNull();
  });
});

describe("parseFanId", () => {
  it("accepts only a uuid", () => {
    expect(parseFanId(UUID.toUpperCase())).toBe(UUID);
    expect(parseFanId("nope")).toBeNull();
    expect(parseFanId(undefined)).toBeNull();
  });
});

describe("workRawFromFormData", () => {
  it("reads every field the form sends", () => {
    const fd = new FormData();
    fd.set("name", "Ana");
    fd.set("link_dribbble", "https://dribbble.com/ana");
    fd.set("ownership", "on");
    fd.set("imagePath", `${UUID}.png`);
    const raw = workRawFromFormData(fd);
    expect(raw.name).toBe("Ana");
    expect(raw.links?.dribbble).toBe("https://dribbble.com/ana");
    expect(raw.ownership).toBe("on");
    expect(raw.imagePath).toBe(`${UUID}.png`);
  });
});
