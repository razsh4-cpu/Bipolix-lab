// Adds the machines Raz listed for the mobile lab to an existing organization.
// Usage: npm run lab:machines -- --slug org-slug
// Safe to run again: machines that already exist by name are skipped.
import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";
import { addLabMachines } from "./lib/setup";

async function main() {
  const { values } = parseArgs({ options: { slug: { type: "string" } } });
  if (!values.slug) throw new Error("Missing --slug");
  await addLabMachines(db, values.slug);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
