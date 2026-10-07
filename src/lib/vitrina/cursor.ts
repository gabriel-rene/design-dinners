// Opaque keyset cursor for the feed: (published_at, id) of the last piece
// shown. The timestamp string is kept exactly as Postgres sent it — a JS Date
// would drop the microseconds and the next page would repeat or skip a row.
import { isUuid } from "@/lib/rsvp";

export type FeedCursor = { ts: string; id: string };

const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(`${cursor.ts}|${cursor.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw || raw.length > 200) return null;
  const [ts, id, extra] = Buffer.from(raw, "base64url").toString("utf8").split("|");
  if (extra !== undefined || !ts || !id || !TS_RE.test(ts) || !isUuid(id)) return null;
  return { ts, id };
}
