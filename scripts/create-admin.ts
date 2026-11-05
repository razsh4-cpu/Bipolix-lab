// Creates an organization (if missing) and an ADMIN user for it.
// Usage:
//   npm run admin:create -- --email a@b.c --name "Full Name" --org "Org name" --slug org-slug [--lab "Lab name" --lab-type MOBILE|FIXED]
// The password is read from ADMIN_PASSWORD or prompted for, so it never lands in shell history.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { db } from "../src/lib/db";
import { createAdmin } from "./lib/setup";

const Args = z.object({
  email: z.email(),
  name: z.string().min(1),
  org: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug: lowercase letters, digits and dashes"),
  lab: z.string().min(1).optional(),
  "lab-type": z.enum(["MOBILE", "FIXED"]).default("FIXED"),
});

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Password (min 10 chars): ");
  rl.close();
  return answer;
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      org: { type: "string" },
      slug: { type: "string" },
      lab: { type: "string" },
      "lab-type": { type: "string" },
    },
  });
  const args = Args.parse(values);
  const password = await readPassword();

  const created = await createAdmin(db, {
    email: args.email,
    name: args.name,
    password,
    org: args.org,
    slug: args.slug,
    lab: args.lab,
    labType: args["lab-type"],
  });
  if (!created) throw new Error(`User ${args.email} already exists`);

  console.log(`Created ADMIN ${args.email.toLowerCase()} in organization "${args.org}" (${args.slug}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
