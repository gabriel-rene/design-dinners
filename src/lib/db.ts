import { neon } from "@neondatabase/serverless";

// Instantiated with the defaults `neon(url)` returns; the bare
// `ReturnType<typeof neon>` widens to <boolean, boolean> and loses row typing.
export type Sql = ReturnType<typeof neon<false, false>>;

export const hasDatabaseConfig = Boolean(process.env.DATABASE_URL);

export function getDb(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(connectionString);
}
