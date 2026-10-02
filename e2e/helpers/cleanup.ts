import { neon } from "@neondatabase/serverless";
import type { BrowserContext } from "@playwright/test";

export async function cleanupTestRows(
  _context: BrowserContext,
  stamp: string | number,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const sql = neon(process.env.DATABASE_URL);
  const pattern = `%${stamp}%`;

  await sql.transaction((txn) => [
    txn`delete from events where title like ${pattern}`,
    txn`delete from speakers where name like ${pattern}`,
  ]);
}

/** Creates a stamped event straight in Neon and returns its id. */
export async function createTestEvent(opts: {
  stamp: string | number;
  title: string;
  daysFromNow: number;
  capacity: number | null;
  registrationUrl?: string | null;
}): Promise<string> {
  const sql = neon(process.env.DATABASE_URL!);
  const date = new Date(Date.now() + opts.daysFromNow * 864e5).toISOString();
  const rows = (await sql`
    insert into events (title, event_date, capacity, registration_url)
    values (${`${opts.title} ${opts.stamp}`}, ${date}, ${opts.capacity}, ${opts.registrationUrl ?? null})
    returning id
  `) as { id: string }[];
  return rows[0].id;
}
