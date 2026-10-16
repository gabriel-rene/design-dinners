import { describe, expect, it } from "vitest";

import { buildApprovalEmail } from "./email";

const input = {
  title: `Charla <script>alert("x")</script> & más`,
  startsAt: "2026-10-20T23:00:00.000Z",
  pageUrl: "https://designdinners.com/otros-eventos",
  now: new Date("2026-10-14T16:00:00Z"),
};

describe("buildApprovalEmail", () => {
  it("has the fixed subject", () => {
    expect(buildApprovalEmail(input).subject).toBe("¡Tu evento está en Design Dinners!");
  });
  it("escapes the title in HTML", () => {
    const { html } = buildApprovalEmail(input);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Charla &lt;script&gt;");
    expect(html).toContain("&amp; más");
  });
  it("gives date, time, page link and mascot", () => {
    const { html, text } = buildApprovalEmail(input);
    expect(text).toContain("martes, 20 de octubre");
    expect(text).toMatch(/7:00\sp\.\sm\./);
    expect(text).toContain("https://designdinners.com/otros-eventos");
    expect(text).toContain("Ya aparece en Otros eventos.");
    expect(html).toContain("https://designdinners.com/brand/mascot-email.png");
    expect(html).toContain('href="https://designdinners.com/otros-eventos"');
  });
});
