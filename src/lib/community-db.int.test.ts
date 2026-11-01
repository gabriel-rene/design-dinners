import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

import { countRecentMembersByIp, listMembers, upsertMember } from "./community-db";

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

  it("keeps one row per email and updates the answers", async () => {
    await upsertMember(sql, { name: "A", email, discipline: "grafico", disciplineOther: null, ipHash });
    await upsertMember(sql, {
      name: "A B",
      email: email.toUpperCase(),
      discipline: "otra",
      disciplineOther: "Sonido",
      ipHash,
    });
    const mine = (await listMembers(sql)).filter((m) => m.email.toLowerCase() === email);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: "A B", discipline: "otra", discipline_other: "Sonido" });
  });

  it("counts recent sign-ups by IP", async () => {
    expect(await countRecentMembersByIp(sql, ipHash)).toBe(1);
    expect(await countRecentMembersByIp(sql, `${stamp}-other`)).toBe(0);
  });
});
