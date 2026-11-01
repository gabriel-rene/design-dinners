// WhatsApp group gate, shared by the client dialog and the server. Pure: no
// Next imports, no secrets. The invite link itself never lives here: only
// the server hands it out (see whatsapp.ts).
import { disciplineLabel } from "./disciplines";
import { csvCell } from "./rsvp";

/** Every "Únete al WhatsApp" button points here. With JS the click opens the
 *  sign-up dialog; without JS it is a landing page with the same form. */
export const JOIN_PATH = "/unete";

/** Server redirect to the group for visitors who already signed up. */
export const ENTER_PATH = "/unete/entrar";

/** Set after the sign-up form or an RSVP. Not httpOnly: the dialog reads it
 *  to skip the form. It holds no secret, so faking it only skips a soft gate. */
export const JOINED_COOKIE = "dd_wa";
export const JOINED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function hasJoinedCookie(cookieHeader: string): boolean {
  return cookieHeader.split(";").some((part) => part.trim() === `${JOINED_COOKIE}=1`);
}

/** Sign-ups stored per IP per hour. Past it the visitor still gets the link;
 *  the answers are just not saved (stops one script from flooding the list). */
export const JOIN_RATE_LIMIT_PER_HOUR = 30;

type MemberCsvRow = {
  name: string;
  email: string;
  discipline: string;
  discipline_other: string | null;
  created_at: string;
};

export function buildMembersCsv(rows: MemberCsvRow[]): string {
  const lines = [
    ["Nombre", "Correo", "Disciplina", "Se unió (UTC)"],
    ...rows.map((row) => [
      row.name,
      row.email,
      disciplineLabel(row.discipline, row.discipline_other),
      new Date(row.created_at).toISOString(),
    ]),
  ].map((cols) => cols.map(csvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** How many sign-ups per discipline, biggest first ("Otra" answers grouped). */
export function countByDiscipline(rows: { discipline: string }[]): { discipline: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.discipline, (counts.get(row.discipline) ?? 0) + 1);
  return [...counts]
    .map(([discipline, count]) => ({ discipline, count }))
    .sort((a, b) => b.count - a.count || disciplineLabel(a.discipline, null).localeCompare(disciplineLabel(b.discipline, null), "es"));
}
