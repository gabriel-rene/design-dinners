import { describe, expect, it } from "vitest";

import { buildLoginEmail, loginLink, loginOrigin } from "./admin-login";

const FALLBACK = "https://design-dinners.vercel.app/";

describe("loginOrigin", () => {
  it("keeps the visitor on the domain they used", () => {
    expect(loginOrigin("designdinners.com", "https", FALLBACK)).toBe("https://designdinners.com");
    expect(loginOrigin("www.designdinners.com", null, FALLBACK)).toBe("https://www.designdinners.com");
    expect(loginOrigin("localhost:3000", "http", FALLBACK)).toBe("http://localhost:3000");
  });

  it("uses the fallback for unknown or missing hosts", () => {
    expect(loginOrigin("evil.example", "https", FALLBACK)).toBe("https://design-dinners.vercel.app");
    expect(loginOrigin(null, null, FALLBACK)).toBe("https://design-dinners.vercel.app");
  });
});

describe("loginLink", () => {
  it("points at the callback with a token hash that works in any browser", () => {
    const url = new URL(loginLink("https://designdinners.com", "abc123"));
    expect(url.origin + url.pathname).toBe("https://designdinners.com/auth/callback");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("email");
    expect(url.searchParams.get("next")).toBe("/admin");
  });
});

describe("buildLoginEmail", () => {
  it("puts the link in both the html and text parts", () => {
    const email = buildLoginEmail("ana@example.com", "https://x.test/l");
    expect(email.to).toBe("ana@example.com");
    expect(email.html).toContain('href="https://x.test/l"');
    expect(email.text).toContain("https://x.test/l");
  });
});
