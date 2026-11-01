// Pure builder for the "someone wants to help with Pulso" notice the team
// gets. Reply-to is the sender, so answering the email answers them. Every
// visitor-typed value is escaped: the HTML must never carry their markup.
import { escapeHtml } from "@/lib/rsvp-email";

import type { PulsoInput, PulsoRole } from "./validate";

export const ROLE_LABEL_ES: Record<PulsoRole, string> = {
  metodo: "Asesoría de método",
  academia: "Academia",
  auspicio: "Auspicio",
  difusion: "Difusión",
  voluntariado: "Voluntariado",
  encuesta: "Quiere contestar la encuesta",
};

const FONT = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

/** One line, no control characters: safe for a subject header. */
function subjectSafe(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function buildInterestEmail(input: PulsoInput): { subject: string; html: string; text: string; replyTo: string } {
  const roles = input.roles.map((role) => ROLE_LABEL_ES[role]).join(", ");
  const rows: [string, string][] = [
    ["Nombre", input.name],
    ["Email", input.email],
    ["Organización", input.organization ?? "—"],
    ["Cómo quiere ayudar", roles],
    ["Idioma de la página", input.lang === "en" ? "Inglés" : "Español"],
    ["Mensaje", input.message ?? "—"],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 16px 8px 0;vertical-align:top;color:#964220;font-weight:600;white-space:nowrap">${label}</td>` +
        `<td style="padding:8px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    subject: `Pulso: ${subjectSafe(input.name)} quiere ayudar (${roles})`,
    replyTo: input.email,
    html:
      `<div style="font-family:${FONT};font-size:15px;line-height:1.5;color:#000;background:#f8e3ca;padding:24px">` +
      `<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#d21432">Nueva persona interesada en Pulso del Diseño PR</p>` +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${htmlRows}</table>` +
      `<p style="margin:16px 0 0;color:#964220">Contesta este email para escribirle directo.</p></div>`,
    text: [
      "Nueva persona interesada en Pulso del Diseño PR",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      "Contesta este email para escribirle directo.",
    ].join("\n"),
  };
}
