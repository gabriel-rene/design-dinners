import { neon } from "@neondatabase/serverless";

export const hasDatabaseConfig = Boolean(process.env.DATABASE_URL);

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(connectionString);
}
