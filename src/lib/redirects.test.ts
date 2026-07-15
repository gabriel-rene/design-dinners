import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./redirects";

describe("sanitizeNextPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(sanitizeNextPath("/admin")).toBe("/admin");
    expect(sanitizeNextPath("/admin/eventos?tab=pasados")).toBe(
      "/admin/eventos?tab=pasados",
    );
    expect(sanitizeNextPath("/")).toBe("/");
  });

  it("rejects host-relative values that change the redirect host", () => {
    // `${origin}${next}` with origin lacking a trailing slash:
    // "http://localhost:3000" + ".evil.com" => "http://localhost:3000.evil.com"
    expect(sanitizeNextPath(".evil.com")).toBe("/admin");
    expect(sanitizeNextPath("@evil.com")).toBe("/admin");
    expect(sanitizeNextPath(":8080@evil.com")).toBe("/admin");
  });

  it("rejects protocol-relative and backslash-normalized URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/admin");
    expect(sanitizeNextPath("//evil.com/admin")).toBe("/admin");
    // Browsers normalize backslashes to slashes in URLs.
    expect(sanitizeNextPath("/\\evil.com")).toBe("/admin");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/admin");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/admin");
  });

  it("falls back to /admin for missing or empty values", () => {
    expect(sanitizeNextPath(null)).toBe("/admin");
    expect(sanitizeNextPath("")).toBe("/admin");
  });
});
