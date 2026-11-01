import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

import { insertMember, listMembers } from "./community-db";

const url = process.env.DATABASE_URL;
const stamp = `jointest-${Date.now()}`;

describe.skipIf(!url)("community-db (needs DATABASE_URL)", () => {
  // Placeholder URL never connects: no test body runs without DATABASE_URL.
  const sql = neon(url ?? "postgres://skipped:skipped@localhost/skipped");
  const email = `${stamp}@x.co`;
  const ipHash = `${stamp}-ip`;

  afterAll(async () => {
    await sql`delete from community_members where email ilike ${`${stamp}%`}`;
  });

  it("keeps the first answer for an email, whatever the letter case", async () => {
    const first = { name: "A", email, discipline: "grafico", disciplineOther: null, ipHash };
    expect(await insertMember(sql, first, 30)).toBe(true);
    const takeover = { name: "Intruso", email: email.toUpperCase(), discipline: "otra", disciplineOther: "x", ipHash };
    expect(await insertMember(sql, takeover, 30)).toBe(false);
    const mine = (await listMembers(sql)).filter((m) => m.email.toLowerCase() === email);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: "A", discipline: "grafico", discipline_other: null });
  });

  it("never stores more than the hourly limit per IP, even in parallel", async () => {
    const burstIp = `${stamp}-burst`;
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        insertMember(sql, { name: `P${i}`, email: `${stamp}-p${i}@x.co`, discipline: "ux-ui", disciplineOther: null, ipHash: burstIp }, 3),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    const rows = (await sql`select count(*)::int as n from community_members where ip_hash = ${burstIp}`) as { n: number }[];
    expect(rows[0].n).toBe(3);
  });
});
