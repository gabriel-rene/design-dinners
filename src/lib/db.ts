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

/** What is safe to log from a DB error: Postgres `detail` (and the driver's
 *  copy of it) can contain the failing row, i.e. a visitor's name or email. */
export function dbErrorSummary(error: unknown): { code?: string; message: string } {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "string" ? code : undefined,
      message: typeof message === "string" ? message : "unknown error",
    };
  }
  return { message: String(error) };
}
