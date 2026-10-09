// Pure builder for the RSVP emails: subject, HTML, plain text and (for a new
// seat) the calendar file. The HTML mirrors the on-site RsvpTicket — a printed
// ticket stub — using tables and inline styles so it renders in Gmail, Outlook
// and Apple Mail. The only image is the mascot PNG (Gmail drops SVG).
import { formatEventDate, formatEventTime } from "./format";
import { buildIcs } from "./ics";
import type { EventRow } from "./types";

export type RsvpEmailKind = "confirmed" | "waitlist" | "promoted" | "reminder" | "final";

export type RsvpEmailInput = {
  kind: RsvpEmailKind;
  guestName: string;
  /** Seat number (confirmed) or place in line (waitlist). Null when unknown. */
  position: number | null;
  capacity: number | null;
  event: Pick<EventRow, "id" | "title" | "description" | "location" | "event_date">;
  eventUrl: string;
  whatsappGroupUrl: string | null;
  /** The guest's "liberar mi puesto" page. Null = fall back to "reply to this email". */
  cancelUrl: string | null;
  now?: Date;
};

export type RsvpEmail = { subject: string; html: string; text: string; ics?: string };

const C = {
  red: "#d21432",
  yellow: "#faa61a",
  brown: "#964220",
  cream: "#f8e3ca",
  black: "#000000",
};
const DISPLAY = "'Jost','Futura','Century Gothic','Trebuchet MS',Arial,sans-serif";
const BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

type Copy = {
  subject: string;
  preheader: string;
  kicker: string;
  title: string;
  headerBg: string;
  headerInk: string;
  lead: string;
};

const RED_HEADER = { headerBg: C.red, headerInk: C.cream };
const YELLOW_HEADER = { headerBg: C.yellow, headerInk: C.black };

function copyFor(input: RsvpEmailInput, title: string, time: string): Copy {
  switch (input.kind) {
    case "waitlist":
      return {
        subject: `Lista de espera #${input.position ?? "?"}: ${title}`,
        preheader: `Estás #${input.position ?? "?"} en la fila. Si se abre un puesto, te escribimos.`,
        kicker: "Lista de espera",
        title: "Estás en la fila",
        ...YELLOW_HEADER,
        lead: "La mesa está llena. Si alguien cancela, te escribimos a este correo.",
      };
    case "promoted":
      return {
        subject: `¡Se abrió un puesto! ${title}`,
        preheader: "Saliste de la lista de espera. Tienes puesto en la mesa.",
        kicker: "Design Dinners",
        title: "¡Se abrió un puesto!",
        ...RED_HEADER,
        lead: "Saliste de la lista de espera. Ya tienes puesto en la mesa.",
      };
    case "reminder":
      return {
        subject: `Mañana: ${title}`,
        preheader: `Mañana a las ${time}. Te esperamos en la mesa.`,
        kicker: "Recordatorio",
        title: "¡Mañana es la cena!",
        ...YELLOW_HEADER,
        lead: "Te esperamos mañana. Si ya no puedes ir, libera tu puesto para que otra persona lo aproveche.",
      };
    case "final":
      return {
        subject: `Hoy: ${title} · ${time}`,
        preheader: `Hoy a las ${time}. Aquí tienes cómo llegar.`,
        kicker: "Hoy",
        title: "¡Nos vemos pronto!",
        ...RED_HEADER,
        lead: "Hoy es el día. Aquí tienes cómo llegar.",
      };
    case "confirmed":
      return {
        subject: `Tienes puesto: ${title}`,
        preheader: "Tu reserva está confirmada. Aquí tienes los detalles.",
        kicker: "Design Dinners",
        title: "¡Tienes puesto!",
        ...RED_HEADER,
        lead: "Tu reserva está confirmada. Te esperamos en la mesa.",
      };
  }
}

function seatLabel(input: RsvpEmailInput): string | null {
  if (input.kind !== "confirmed" || !input.position) return null;
  return input.capacity ? `${input.position} de ${input.capacity}` : `#${input.position}`;
}

function button(href: string, label: string, bg: string, ink: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;">
<tr><td align="center" bgcolor="${bg}" style="background:${bg};border:2px solid ${C.black};border-radius:999px;">
<a href="${esc(href)}" style="display:block;padding:14px 20px;font-family:${BODY};font-size:15px;font-weight:700;line-height:20px;color:${ink};text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}

function detailCell(label: string, value: string): string {
  return `<td valign="top" width="50%" style="padding:0 8px 14px 0;">
<p style="margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.brown};">${esc(label)}</p>
<p style="margin:2px 0 0;font-family:${BODY};font-size:15px;font-weight:600;line-height:21px;color:${C.black};">${esc(value)}</p>
</td>`;
}

type Action = { href: string; label: string; bg: string; ink: string };

export function buildRsvpEmail(input: RsvpEmailInput): RsvpEmail {
  const now = input.now ?? new Date();
  const title = oneLine(input.event.title);
  // Non-breaking spaces keep "7:00 p. m." on one line.
  const time = formatEventTime(input.event.event_date).replace(/\s/g, " ");
  const copy = copyFor(input, title, time);
  const when = `${formatEventDate(input.event.event_date, now)} · ${time}`;
  const seat = seatLabel(input);
  const holdsSeat = input.kind !== "waitlist";
  const newSeat = input.kind === "confirmed" || input.kind === "promoted";
  const isReminder = input.kind === "reminder" || input.kind === "final";
  const mascotSrc = `${new URL(input.eventUrl).origin}/brand/mascot-email.png`;

  const details: [string, string][] = [
    ["Evento", title],
    ["Cuándo", when],
    ...(input.event.location ? ([["Dónde", input.event.location]] as [string, string][]) : []),
    ...(seat ? ([["Asiento", seat]] as [string, string][]) : []),
  ];
  const detailRows: string[] = [];
  for (let i = 0; i < details.length; i += 2) {
    const pair = details.slice(i, i + 2);
    detailRows.push(
      `<tr>${pair.map(([l, v]) => detailCell(l, v)).join("")}${pair.length === 1 ? '<td width="50%"></td>' : ""}</tr>`,
    );
  }

  const bigPosition =
    input.kind === "waitlist" && input.position
      ? `<td align="right" valign="bottom" style="font-family:${DISPLAY};font-size:56px;font-weight:800;line-height:48px;color:${copy.headerInk};">#${input.position}</td>`
      : "";

  // Buttons, in order. The same list feeds the HTML and the plain text.
  const actions: Action[] = [];
  if (isReminder && input.event.location) {
    actions.push({ href: mapsUrl(input.event.location), label: "Cómo llegar", bg: C.black, ink: C.cream });
  } else {
    actions.push({ href: input.eventUrl, label: "Ver el evento", bg: C.black, ink: C.cream });
  }
  if (input.kind === "waitlist" && input.whatsappGroupUrl) {
    actions.push({ href: input.whatsappGroupUrl, label: "Únete al WhatsApp para la próxima", bg: C.red, ink: C.cream });
  }
  if (input.cancelUrl) {
    actions.push({
      href: input.cancelUrl,
      label: holdsSeat ? "No puedo ir: liberar mi puesto" : "Salir de la lista de espera",
      bg: C.cream,
      ink: C.black,
    });
  }
  const buttonRows = actions
    .map((a, i) => `<tr><td${i ? ' style="padding-top:10px;"' : ""}>${button(a.href, a.label, a.bg, a.ink)}</td></tr>`)
    .join("");

  const calendarNote = newSeat
    ? `<p style="margin:12px 0 0;font-family:${BODY};font-size:13px;line-height:19px;color:${C.black};text-align:center;">Abre el archivo adjunto para añadirlo a tu calendario.</p>`
    : "";
  const replyNote = holdsSeat && !input.cancelUrl
    ? `<p style="margin:18px 4px 0;font-family:${BODY};font-size:14px;line-height:21px;color:${C.black};">¿No vas a poder llegar? Contesta este correo y le pasamos tu puesto a otra persona.</p>`
    : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.cream}" style="background:${C.cream};">
<tr><td align="center" style="padding:24px 16px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:0 4px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="bottom" style="font-family:${DISPLAY};font-size:18px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;color:${C.black};">Design Dinners</td>
<td align="right" valign="bottom" width="96"><img src="${esc(mascotSrc)}" width="96" alt="Design Dinners" style="display:block;width:96px;height:auto;border:0;outline:none;"></td>
</tr></table>
</td></tr>
<tr><td style="border:2px solid ${C.black};border-radius:16px;background:${C.cream};box-shadow:4px 6px 0 0 ${C.black};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td bgcolor="${copy.headerBg}" style="background:${copy.headerBg};border-bottom:2px solid ${C.black};border-radius:14px 14px 0 0;padding:16px 20px 18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="bottom">
<p style="margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${copy.headerInk};">${esc(copy.kicker)}</p>
<h1 style="margin:10px 0 0;font-family:${DISPLAY};font-size:34px;font-weight:800;line-height:34px;text-transform:uppercase;color:${copy.headerInk};">${esc(copy.title)}</h1>
</td>${bigPosition}
</tr></table>
</td></tr>
<tr><td style="padding:18px 20px 4px;">
<p style="margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.brown};">A nombre de</p>
<p style="margin:4px 0 14px;font-family:${DISPLAY};font-size:26px;font-weight:700;line-height:28px;color:${C.black};word-break:break-word;">${esc(input.guestName)}</p>
<p style="margin:0 0 16px;font-family:${BODY};font-size:15px;line-height:23px;color:${C.black};">${esc(copy.lead)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows.join("")}</table>
</td></tr>
<tr><td style="padding:2px 20px;"><div style="border-top:2px dashed #a6a6a6;height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
<tr><td style="padding:16px 20px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${buttonRows}</table>${calendarNote}
</td></tr>
</table>
</td></tr>
<tr><td>${replyNote}
<p style="margin:24px 4px 0;font-family:${BODY};font-size:12px;line-height:18px;color:${C.brown};">Design Dinners · El diseño se sienta a cenar.<br>Recibes este correo porque reservaste en designdinners.com.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const textLines = [
    copy.title,
    "",
    `A nombre de: ${input.guestName}`,
    copy.lead,
    "",
    ...details.map(([l, v]) => `${l}: ${v}`),
    "",
    ...actions.map((a) => `${a.label}: ${a.href}`),
    ...(newSeat ? ["Abre el archivo adjunto para añadirlo a tu calendario."] : []),
    ...(replyNote ? ["", "¿No vas a poder llegar? Contesta este correo y le pasamos tu puesto a otra persona."] : []),
    "",
    "Design Dinners · El diseño se sienta a cenar.",
  ];

  return {
    subject: copy.subject,
    html,
    text: textLines.join("\n"),
    ics: newSeat ? buildIcs(input.event, input.eventUrl, now) : undefined,
  };
}
