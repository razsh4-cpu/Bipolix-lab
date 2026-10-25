// Creates an organization (if missing) and an ADMIN user for it.
// Usage:
//   npm run admin:create -- --email a@b.c --name "Full Name" --org "Org name" --slug org-slug [--lab "Lab name" --lab-type MOBILE|FIXED]
// The password is read from ADMIN_PASSWORD or prompted for, so it never lands in shell history.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "../src/lib/db";

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
  if (password.length < 10) throw new Error("Password must be at least 10 characters");

  const email = args.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new Error(`User ${email} already exists`);

  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: args.slug },
      update: {},
      create: { name: args.org, slug: args.slug },
    });
    if (args.lab) {
      await tx.lab.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: args.lab } },
        update: {},
        create: { organizationId: organization.id, name: args.lab, type: args["lab-type"] },
      });
    }
    const userId = randomUUID();
    await tx.user.create({ data: { id: userId, name: args.name, email, emailVerified: true } });
    await tx.account.create({
      data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash },
    });
    await tx.membership.create({ data: { userId, organizationId: organization.id, role: "ADMIN" } });
    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "user.create",
        entityType: "User",
        entityId: userId,
        details: { role: "ADMIN", via: "create-admin script" },
      },
    });
  });

  console.log(`Created ADMIN ${email} in organization "${args.org}" (${args.slug}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
