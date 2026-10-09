import { describe, expect, it } from "vitest";

import { buildRsvpEmail, type RsvpEmailInput } from "./rsvp-email";

const event = {
  id: "3f2b8c1e-0d4a-4b6f-9c2e-1a2b3c4d5e6f",
  title: "Del Diseño al Impacto",
  description: "Una mesa larga.",
  location: "Morena Coffee, Santurce",
  event_date: "2026-10-15T23:00:00Z",
};

function input(overrides: Partial<RsvpEmailInput> = {}): RsvpEmailInput {
  return {
    kind: "confirmed",
    guestName: "Ana Rivera",
    position: 7,
    capacity: 20,
    event,
    eventUrl: `https://designdinners.com/eventos/${event.id}`,
    whatsappGroupUrl: "https://chat.whatsapp.com/abc",
    now: new Date("2026-10-09T12:00:00Z"),
    ...overrides,
  };
}

describe("buildRsvpEmail", () => {
  it("confirmed: names the event, seat, date and place, and attaches a calendar file", () => {
    const email = buildRsvpEmail(input());
    expect(email.subject).toBe("Tienes puesto: Del Diseño al Impacto");
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Ana Rivera");
      expect(body).toContain("7 de 20");
      expect(body).toContain("Morena Coffee, Santurce");
      expect(body).toContain("jueves, 15 de octubre");
      expect(body).toContain("7:00\u00a0p.");
      expect(body).toContain(`https://designdinners.com/eventos/${event.id}`);
    }
    expect(email.ics).toContain("BEGIN:VEVENT");
    expect(email.ics).toContain(`UID:${event.id}@designdinners`);
  });

  it("confirmed without a capacity shows the seat as a number", () => {
    const email = buildRsvpEmail(input({ capacity: null }));
    expect(email.text).toContain("#7");
    expect(email.text).not.toContain("7 de");
  });

  it("waitlist: shows the place in line, no calendar file, and the WhatsApp link", () => {
    const email = buildRsvpEmail(input({ kind: "waitlist", position: 3 }));
    expect(email.subject).toBe("Lista de espera #3: Del Diseño al Impacto");
    expect(email.html).toContain("#3");
    expect(email.html).toContain("https://chat.whatsapp.com/abc");
    expect(email.text).toContain("https://chat.whatsapp.com/abc");
    expect(email.ics).toBeUndefined();
  });

  it("waitlist without a WhatsApp URL leaves the WhatsApp button out", () => {
    const email = buildRsvpEmail(input({ kind: "waitlist", position: 3, whatsappGroupUrl: null }));
    expect(email.html).not.toContain("WhatsApp");
    expect(email.text).not.toContain("WhatsApp");
  });

  it("promoted: says a seat opened and attaches a calendar file", () => {
    const email = buildRsvpEmail(input({ kind: "promoted", position: null }));
    expect(email.subject).toBe("¡Se abrió un puesto! Del Diseño al Impacto");
    expect(email.html).toContain("Se abrió un puesto");
    expect(email.text).not.toContain("Asiento");
    expect(email.ics).toContain("BEGIN:VEVENT");
  });

  it("escapes HTML in guest and event text", () => {
    const email = buildRsvpEmail(
      input({ guestName: `<script>x</script> & "Bo"`, event: { ...event, title: "A <b>B</b>", location: null } }),
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<b>B</b>");
    expect(email.html).toContain("&lt;script&gt;x&lt;/script&gt; &amp; &quot;Bo&quot;");
    expect(email.html).not.toContain("Dónde");
  });

  it("puts no line breaks in the subject", () => {
    const email = buildRsvpEmail(input({ event: { ...event, title: "Línea uno\nLínea dos" } }));
    expect(email.subject).toBe("Tienes puesto: Línea uno Línea dos");
  });
});
