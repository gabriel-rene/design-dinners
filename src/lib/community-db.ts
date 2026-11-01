// Server-only DB access for WhatsApp sign-ups. Every function takes `sql` so
// tests can pass their own client.
import type { Sql } from "./db";

export type CommunityMember = {
  id: string;
  name: string;
  email: string;
  discipline: string;
  discipline_other: string | null;
  created_at: string;
  updated_at: string;
};

type InsertInput = {
  name: string;
  email: string;
  discipline: string;
  disciplineOther: string | null;
  ipHash: string | null;
};

/**
 * Saves one sign-up. The first answer for an email (any letter case) wins: a
 * repeat never overwrites it, so nobody can rewrite another person's row by
 * typing their email. With an IP hash, a per-IP advisory lock makes the
 * hourly count and the insert one step, so parallel requests can't slip past
 * the limit. Returns false when nothing was stored (duplicate or over limit).
 */
export async function insertMember(sql: Sql, input: InsertInput, limitPerHour: number): Promise<boolean> {
  const { name, email, discipline, disciplineOther, ipHash } = input;
  const results = await sql.transaction((txn) => {
    const insert = txn`
      insert into community_members (name, email, discipline, discipline_other, ip_hash)
      select ${name}, ${email}, ${discipline}, ${disciplineOther}, ${ipHash}
      where ${ipHash}::text is null
         or (select count(*) from community_members
             where ip_hash = ${ipHash} and created_at > now() - interval '1 hour') < ${limitPerHour}
      on conflict ((lower(email))) do nothing
      returning id
    `;
    // No IP (local dev, or no salt): no limit, so nothing to serialize on.
    return ipHash ? [txn`select pg_advisory_xact_lock(hashtext(${`join-ip:${ipHash}`}))`, insert] : [insert];
  });
  return (results[results.length - 1] as unknown as { id: string }[]).length > 0;
}

export async function listMembers(sql: Sql): Promise<CommunityMember[]> {
  return (await sql`
    select id, name, email, discipline, discipline_other, created_at, updated_at
    from community_members
    order by created_at desc
  `) as CommunityMember[];
}
