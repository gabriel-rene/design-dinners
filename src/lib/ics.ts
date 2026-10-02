// Minimal RFC 5545 calendar file for one event.
const DURATION_MS = 2 * 60 * 60 * 1000;

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** RFC 5545 §3.1: lines are at most 75 octets (not characters). Count UTF-8
 *  bytes and never split a character; a continuation line starts with one
 *  space, which counts toward its 75. */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function buildIcs(
  event: { id: string; title: string; description: string | null; location: string | null; event_date: string },
  url: string,
  now: Date = new Date(),
): string {
  const start = new Date(event.event_date);
  const description = [event.description, url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Design Dinners//RSVP//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@designdinners`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + DURATION_MS))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
