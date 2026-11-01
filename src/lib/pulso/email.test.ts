import { describe, expect, it } from "vitest";

import { buildInterestEmail } from "./email";
import type { PulsoInput } from "./validate";

const input: PulsoInput = {
  name: "Ana <b>Rivera</b>",
  email: "ana@ejemplo.com",
  organization: null,
  roles: ["auspicio", "encuesta"],
  message: "Hola\n<script>x</script>",
  lang: "en",
};

describe("buildInterestEmail", () => {
  it("replies to the sender and names the roles in the subject", () => {
    const email = buildInterestEmail(input);
    expect(email.replyTo).toBe("ana@ejemplo.com");
    expect(email.subject).toBe("Pulso: Ana <b>Rivera</b> quiere ayudar (Auspicio, Quiere contestar la encuesta)");
  });

  it("escapes visitor text in the HTML", () => {
    const { html } = buildInterestEmail(input);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Rivera");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps the subject on one line", () => {
    expect(buildInterestEmail({ ...input, name: "Ana\r\nBcc: x@y.com" }).subject).toBe(
      "Pulso: Ana Bcc: x@y.com quiere ayudar (Auspicio, Quiere contestar la encuesta)",
    );
  });

  it("shows a dash for empty optionals in the text version", () => {
    const { text } = buildInterestEmail(input);
    expect(text).toContain("Organización: —");
    expect(text).toContain("Idioma de la página: Inglés");
  });
});
