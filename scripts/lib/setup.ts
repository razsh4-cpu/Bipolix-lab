// Shared setup steps used by the CLI scripts and by the first deploy (bootstrap.ts).
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../src/generated/prisma/client";

export type NewAdmin = {
  email: string;
  name: string;
  password: string;
  org: string;
  slug: string;
  lab?: string;
  labType: "MOBILE" | "FIXED";
};

// Returns false when the user already exists, so it is safe to run on every deploy.
export async function createAdmin(db: PrismaClient, input: NewAdmin) {
  if (input.password.length < 10) throw new Error("Password must be at least 10 characters");
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return false;

  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: input.slug },
      update: {},
      create: { name: input.org, slug: input.slug },
    });
    if (input.lab) {
      await tx.lab.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: input.lab } },
        update: {},
        create: { organizationId: organization.id, name: input.lab, type: input.labType },
      });
    }
    const userId = randomUUID();
    await tx.user.create({ data: { id: userId, name: input.name, email, emailVerified: true } });
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
        details: { role: "ADMIN", via: "setup script" },
      },
    });
  });
  return true;
}

const MACHINE_NOTE = "נוסף מרשימת המכונות הראשונית. יש לאמת סטטוס, יצרן, דגם ומספר סידורי.";

// Only facts Raz gave are filled in (type, and Bambu Lab X2D for the printers).
export const LAB_MACHINES = [
  { name: "מכונת CNC", category: "CNC" },
  { name: "חותך לייזר", category: "לייזר" },
  { name: "Cricut", category: "חותך ויניל", manufacturer: "Cricut" },
  ...[1, 2].map((n) => ({ name: `מדפסת X2D ${n}`, category: "מדפסת תלת-ממד", manufacturer: "Bambu Lab", model: "X2D" })),
];

// Adds the truck's machines; machines that already exist by name are skipped.
export async function addLabMachines(db: PrismaClient, slug: string, log: (line: string) => void = console.log) {
  const org = await db.organization.findUnique({ where: { slug }, include: { labs: { take: 1 } } });
  if (!org) throw new Error(`Organization "${slug}" not found. Create it first with npm run admin:create.`);
  const admin = await db.membership.findFirst({ where: { organizationId: org.id, role: "ADMIN" } });
  if (!admin) throw new Error("The organization has no admin.");

  for (const m of LAB_MACHINES) {
    const exists = await db.equipment.findFirst({ where: { organizationId: org.id, name: m.name, archivedAt: null } });
    if (exists) {
      log(`skip   ${m.name}`);
      continue;
    }
    await db.$transaction(async (tx) => {
      const e = await tx.equipment.create({
        data: { ...m, organizationId: org.id, labId: org.labs[0]?.id ?? null, notes: MACHINE_NOTE },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorId: admin.userId,
          action: "equipment.create",
          entityType: "Equipment",
          entityId: e.id,
          details: { source: "setup script" },
        },
      });
    });
    log(`added  ${m.name}`);
  }
}
