import { describe, expect, it, vi } from "vitest";

import { EMAIL_FROM, EMAIL_REPLY_TO, sendEmail } from "./email";

const message = {
  to: "ana@example.com",
  subject: "Hola",
  html: "<p>Hola</p>",
  text: "Hola",
  attachments: [{ filename: "design-dinners.ics", content: "BEGIN:VCALENDAR" }],
};

describe("sendEmail", () => {
  it("skips without an API key and never calls the network", async () => {
    const fetchImpl = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendEmail(message, { apiKey: undefined, fetchImpl })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("posts the message to Resend with the sender, reply-to and base64 attachment", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendEmail(message, { apiKey: "re_test", fetchImpl })).toBe("sent");

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: EMAIL_FROM,
      to: ["ana@example.com"],
      reply_to: EMAIL_REPLY_TO,
      subject: "Hola",
      html: "<p>Hola</p>",
      text: "Hola",
    });
    expect(body.attachments[0].filename).toBe("design-dinners.ics");
    expect(Buffer.from(body.attachments[0].content, "base64").toString("utf8")).toBe("BEGIN:VCALENDAR");
  });

  it("reports a failure without logging the recipient", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad", { status: 422 }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail(message, { apiKey: "re_test", fetchImpl })).toBe("failed");
    expect(JSON.stringify(error.mock.calls)).not.toContain("ana@example.com");
    error.mockRestore();
  });

  it("reports a network error as a failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail(message, { apiKey: "re_test", fetchImpl })).toBe("failed");
    error.mockRestore();
  });
});
