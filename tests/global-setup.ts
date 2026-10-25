import { execSync } from "node:child_process";
import "dotenv/config";
import { Client } from "pg";

// Integration tests run against a separate database: TEST_DATABASE_URL,
// or DATABASE_URL with the database name suffixed by "_test".
export function testDatabaseUrl() {
  const url =
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL?.replace(/\/([^/?]+)(\?|$)/, "/$1_test$2");
  if (!url) throw new Error("Set TEST_DATABASE_URL or DATABASE_URL");
  const dbName = new URL(url).pathname.slice(1);
  // Safety net: tests wipe this database, so it must be a dedicated test database.
  if (!dbName.endsWith("_test")) throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  return url;
}

export default async function setup() {
  const url = testDatabaseUrl();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length) {
    await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  }
  await client.end();
}
