// Pure builder for the "your event is live" email sent when an admin approves
// a community event. Same look as the RSVP emails (tables + inline styles).
import { formatEventDate, formatEventTime } from "@/lib/format";
import { escapeHtml } from "@/lib/rsvp-email";

export type ApprovalEmailInput = { title: string; startsAt: string; pageUrl: string; now?: Date };

const C = {
  red: "#d21432",
  brown: "#964220",
  cream: "#f8e3ca",
  black: "#000000",
};
const DISPLAY = "'Jost','Futura','Century Gothic','Trebuchet MS',Arial,sans-serif";
const BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function detailCell(label: string, value: string): string {
  return `<td valign="top" width="50%" style="padding:0 8px 14px 0;">
<p style="margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.brown};">${escapeHtml(label)}</p>
<p style="margin:2px 0 0;font-family:${BODY};font-size:15px;font-weight:600;line-height:21px;color:${C.black};">${escapeHtml(value)}</p>
</td>`;
}

export function buildApprovalEmail(input: ApprovalEmailInput) {
  const title = input.title.replace(/\s+/g, " ").trim();
  const time = formatEventTime(input.startsAt);
  const when = `${formatEventDate(input.startsAt, input.now ?? new Date())} · ${time}`;
  const mascotSrc = `${new URL(input.pageUrl).origin}/brand/mascot-email.png`;
  const subject = "¡Tu evento está en Design Dinners!";
  const headline = "¡Tu evento está publicado!";
  const live = "Ya aparece en la agenda de Design Dinners.";

  const text = [
    headline,
    "",
    title,
    when,
    "",
    live,
    `Míralo aquí: ${input.pageUrl}`,
    "",
    "— Design Dinners",
  ].join("\n");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(live)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.cream}" style="background:${C.cream};">
<tr><td align="center" style="padding:24px 16px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:0 4px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="bottom" style="font-family:${DISPLAY};font-size:18px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;color:${C.black};">Design Dinners</td>
<td align="right" valign="bottom" width="96"><img src="${escapeHtml(mascotSrc)}" width="96" alt="Design Dinners" style="display:block;width:96px;height:auto;border:0;outline:none;"></td>
</tr></table>
</td></tr>
<tr><td style="border:2px solid ${C.black};border-radius:16px;background:${C.cream};box-shadow:4px 6px 0 0 ${C.black};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td bgcolor="${C.red}" style="background:${C.red};border-bottom:2px solid ${C.black};border-radius:14px 14px 0 0;padding:16px 20px 18px;">
<p style="margin:0;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.cream};">Agenda</p>
<h1 style="margin:10px 0 0;font-family:${DISPLAY};font-size:34px;font-weight:800;line-height:34px;text-transform:uppercase;color:${C.cream};">${escapeHtml(headline)}</h1>
</td></tr>
<tr><td style="padding:18px 20px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>${detailCell("Evento", title)}</tr>
<tr>${detailCell("Cuándo", when)}</tr>
</table>
<p style="margin:4px 0 16px;font-family:${BODY};font-size:15px;line-height:23px;color:${C.black};">${escapeHtml(live)}</p>
</td></tr>
<tr><td style="padding:2px 20px;"><div style="border-top:2px dashed #a6a6a6;height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
<tr><td style="padding:16px 20px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;">
<tr><td align="center" bgcolor="${C.black}" style="background:${C.black};border:2px solid ${C.black};border-radius:999px;">
<a href="${escapeHtml(input.pageUrl)}" style="display:block;padding:14px 20px;font-family:${BODY};font-size:15px;font-weight:700;line-height:20px;color:${C.cream};text-decoration:none;">${escapeHtml("Ver tu evento")}</a>
</td></tr></table>
</td></tr>
</table>
</td></tr>
<tr><td>
<p style="margin:24px 4px 0;font-family:${BODY};font-size:12px;line-height:18px;color:${C.brown};">Design Dinners · El diseño se sienta a cenar.<br>Recibes este correo porque enviaste un evento en designdinners.com.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
