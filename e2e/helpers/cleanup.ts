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
