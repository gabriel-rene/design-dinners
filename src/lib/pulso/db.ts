// Neon access for the Pulso interest form.
import "server-only";

import type { Sql } from "@/lib/db";

import type { PulsoInput } from "./validate";

/** Sign-ups from this IP hash in the last 24 hours. */
export async function countRecentInterest(sql: Sql, ipHash: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as n from pulso_interest
    where ip_hash = ${ipHash} and created_at > now() - interval '24 hours'
  `;
  return (rows[0]?.n as number | undefined) ?? 0;
}

export async function insertInterest(sql: Sql, input: PulsoInput, ipHash: string | null): Promise<void> {
  await sql`
    insert into pulso_interest (name, email, organization, roles, message, lang, ip_hash)
    values (${input.name}, ${input.email}, ${input.organization}, ${input.roles}, ${input.message}, ${input.lang}, ${ipHash})
  `;
}
