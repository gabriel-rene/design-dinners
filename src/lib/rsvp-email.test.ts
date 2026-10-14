import { describe, expect, it } from "vitest";

import { buildRsvpEmail, mapsUrl, type RsvpEmailInput } from "./rsvp-email";

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
    cancelUrl: "https://designdinners.com/reservas/cancelar/tok",
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

  it("every kind shows the mascot from the site origin", () => {
    for (const kind of ["confirmed", "waitlist", "promoted", "reminder", "final"] as const) {
      expect(buildRsvpEmail(input({ kind })).html).toContain('src="https://designdinners.com/brand/mascot-email.png"');
    }
  });

  it("seat holders get the cancel button; the waitlist gets 'salir'", () => {
    const confirmed = buildRsvpEmail(input());
    expect(confirmed.html).toContain("No puedo ir: liberar mi puesto");
    expect(confirmed.html).toContain('href="https://designdinners.com/reservas/cancelar/tok"');
    expect(confirmed.text).toContain("https://designdinners.com/reservas/cancelar/tok");
    expect(confirmed.html).not.toContain("Contesta este correo");
    expect(buildRsvpEmail(input({ kind: "waitlist", position: 2 })).html).toContain("Salir de la lista de espera");
  });

  it("without a cancel URL it falls back to the reply line", () => {
    const email = buildRsvpEmail(input({ cancelUrl: null }));
    expect(email.html).not.toContain("liberar mi puesto");
    expect(email.html).toContain("Contesta este correo");
  });

  it("reminder: tomorrow subject, maps button, no calendar file", () => {
    const email = buildRsvpEmail(input({ kind: "reminder", position: null }));
    expect(email.subject).toBe("Mañana: Del Diseño al Impacto");
    expect(email.html).toContain("¡Mañana es la cena!");
    expect(email.html).toContain("Cómo llegar");
    expect(email.html).toContain("https://www.google.com/maps/search/?api=1&amp;query=Morena%20Coffee%2C%20Santurce");
    expect(email.text).toContain("Cómo llegar: https://www.google.com/maps/search/?api=1&query=Morena%20Coffee%2C%20Santurce");
    expect(email.ics).toBeUndefined();
  });

  it("final: today subject with the time", () => {
    const email = buildRsvpEmail(input({ kind: "final", position: null }));
    expect(email.subject).toBe("Hoy: Del Diseño al Impacto · 7:00\u00a0p.\u00a0m.");
    expect(email.html).toContain("¡Nos vemos pronto!");
    expect(email.ics).toBeUndefined();
  });

  it("reminders without a location link to the event instead of maps", () => {
    const email = buildRsvpEmail(input({ kind: "reminder", event: { ...event, location: null } }));
    expect(email.html).not.toContain("Cómo llegar");
    expect(email.html).toContain("Ver el evento");
  });

  it("mapsUrl encodes the place", () => {
    expect(mapsUrl("Morena Coffee, Santurce")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Morena%20Coffee%2C%20Santurce",
    );
  });
});
