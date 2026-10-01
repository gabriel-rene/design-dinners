import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const dbDirectory = resolve(process.cwd(), "db");
const files = (await readdir(dbDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const sql = neon(connectionString);

for (const file of files) {
  const source = await readFile(resolve(dbDirectory, file), "utf8");
  const statements = source
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  process.stdout.write(`Applied ${file}\n`);
}
