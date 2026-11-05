// Adds the machines Raz listed for the mobile lab to an existing organization.
// Usage: npm run lab:machines -- --slug org-slug
// Safe to run again: machines that already exist by name are skipped.
// Only facts Raz gave are filled in (type, and Bambu Lab X2D for the printers).
// Serial numbers, purchase dates and status checks are left for the admin.
import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const NOTE = "נוסף מרשימת המכונות הראשונית. יש לאמת סטטוס, יצרן, דגם ומספר סידורי.";

const MACHINES = [
  { name: "מכונת CNC", category: "CNC" },
  { name: "חותך לייזר", category: "לייזר" },
  { name: "Cricut", category: "חותך ויניל", manufacturer: "Cricut" },
  ...[1, 2].map((n) => ({ name: `מדפסת X2D ${n}`, category: "מדפסת תלת-ממד", manufacturer: "Bambu Lab", model: "X2D" })),
];

async function main() {
  const { values } = parseArgs({ options: { slug: { type: "string" } } });
  if (!values.slug) throw new Error("Missing --slug");
  const org = await db.organization.findUnique({ where: { slug: values.slug }, include: { labs: { take: 1 } } });
  if (!org) throw new Error(`Organization "${values.slug}" not found. Create it first with npm run admin:create.`);
  const admin = await db.membership.findFirst({ where: { organizationId: org.id, role: "ADMIN" } });
  if (!admin) throw new Error("The organization has no admin.");

  for (const m of MACHINES) {
    const exists = await db.equipment.findFirst({ where: { organizationId: org.id, name: m.name, archivedAt: null } });
    if (exists) {
      console.log(`skip   ${m.name}`);
      continue;
    }
    await db.$transaction(async (tx) => {
      const e = await tx.equipment.create({
        data: { ...m, organizationId: org.id, labId: org.labs[0]?.id ?? null, notes: NOTE },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorId: admin.userId,
          action: "equipment.create",
          entityType: "Equipment",
          entityId: e.id,
          details: { source: "scripts/add-lab-machines.ts" },
        },
      });
    });
    console.log(`added  ${m.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
