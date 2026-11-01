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

type UpsertInput = {
  name: string;
  email: string;
  discipline: string;
  disciplineOther: string | null;
  ipHash: string | null;
};

/** One row per email (any letter case): signing up again updates the answers. */
export async function upsertMember(sql: Sql, input: UpsertInput): Promise<void> {
  await sql`
    insert into community_members (name, email, discipline, discipline_other, ip_hash)
    values (${input.name}, ${input.email}, ${input.discipline}, ${input.disciplineOther}, ${input.ipHash})
    on conflict ((lower(email))) do update set
      name = excluded.name,
      email = excluded.email,
      discipline = excluded.discipline,
      discipline_other = excluded.discipline_other,
      ip_hash = excluded.ip_hash,
      updated_at = now()
  `;
}

/** Counts updates too, so re-sending one email can't dodge the limit. */
export async function countRecentMembersByIp(sql: Sql, ipHash: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as n from community_members
    where ip_hash = ${ipHash} and updated_at > now() - interval '1 hour'
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export async function listMembers(sql: Sql): Promise<CommunityMember[]> {
  return (await sql`
    select id, name, email, discipline, discipline_other, created_at, updated_at
    from community_members
    order by created_at desc
  `) as CommunityMember[];
}
