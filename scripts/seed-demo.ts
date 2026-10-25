// DEMO DATA for local development only. Every record is clearly labelled [Demo].
// Creates a separate demo organization so it never mixes with real data.
// Usage: npm run seed:demo   (refuses to run when NODE_ENV=production)
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";

const DEMO_SLUG = "demo";
const DEMO_PASSWORD = "demo-password-123";

function daysFromToday(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");
  if (await db.organization.findUnique({ where: { slug: DEMO_SLUG } })) {
    console.log("Demo organization already exists; nothing to do.");
    return;
  }

  const org = await db.organization.create({ data: { name: "[Demo] ארגון הדגמה", slug: DEMO_SLUG } });
  const lab = await db.lab.create({ data: { organizationId: org.id, name: "[Demo] מעבדה ניידת", type: "MOBILE" } });
  const o = { organizationId: org.id };

  const users = [
    { email: "admin@demo.local", name: "[Demo] מנהל", role: "ADMIN" as const },
    { email: "instructor@demo.local", name: "[Demo] מדריך", role: "INSTRUCTOR" as const },
    { email: "viewer@demo.local", name: "[Demo] צופה", role: "VIEWER" as const },
  ];
  const hash = await hashPassword(DEMO_PASSWORD);
  const ids: Record<string, string> = {};
  for (const u of users) {
    const id = randomUUID();
    ids[u.role] = id;
    await db.user.create({ data: { id, name: u.name, email: u.email, emailVerified: true } });
    await db.account.create({ data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash } });
    await db.membership.create({ data: { userId: id, ...o, role: u.role } });
  }
  const adminId = ids.ADMIN;

  const [cnc, laser, , printer] = await Promise.all([
    db.equipment.create({ data: { ...o, labId: lab.id, name: "[Demo] מכונת CNC", category: "CNC" } }),
    db.equipment.create({ data: { ...o, labId: lab.id, name: "[Demo] חותך לייזר", category: "Laser", status: "OUT_OF_SERVICE" } }),
    db.equipment.create({ data: { ...o, labId: lab.id, name: "[Demo] חותך ויניל", category: "Vinyl cutter" } }),
    db.equipment.create({ data: { ...o, labId: lab.id, name: "[Demo] מדפסת תלת-ממד", category: "3D printer", status: "LIMITED_OPERATION" } }),
  ]);

  await db.faultReport.create({
    data: { ...o, equipmentId: laser.id, description: "[Demo] תקלה לדוגמה", severity: "CRITICAL", reportedById: ids.INSTRUCTOR },
  });
  await db.faultReport.create({
    data: { ...o, equipmentId: printer.id, description: "[Demo] תקלה לדוגמה", severity: "MEDIUM", reportedById: ids.INSTRUCTOR },
  });
  await db.maintenancePlan.create({
    data: { ...o, equipmentId: cnc.id, title: "[Demo] טיפול לדוגמה", nextDueAt: daysFromToday(-3), source: "ADMIN", sourceNote: "Demo only" },
  });
  await db.maintenancePlan.create({
    data: { ...o, equipmentId: printer.id, title: "[Demo] טיפול לדוגמה", nextDueAt: daysFromToday(14), source: "ADMIN", sourceNote: "Demo only" },
  });

  const items = [
    { name: "[Demo] לוח עץ", category: "Wood", unit: "יח'", quantity: 3, min: 10 },
    { name: "[Demo] לוח אקריליק", category: "Acrylic", unit: "יח'", quantity: 25, min: 5 },
    { name: "[Demo] גליל ויניל", category: "Vinyl", unit: "גליל", quantity: 1, min: 2 },
  ];
  for (const it of items) {
    const item = await db.inventoryItem.create({
      data: { ...o, labId: lab.id, name: it.name, category: it.category, unit: it.unit, quantity: it.quantity, minStockLevel: it.min },
    });
    await db.inventoryTransaction.create({
      data: { ...o, itemId: item.id, type: "RECEIVE", quantityDelta: it.quantity, balanceAfter: it.quantity, reason: "[Demo] יתרת פתיחה", userId: adminId },
    });
  }

  await db.task.createMany({
    data: [
      { ...o, title: "[Demo] משימה פתוחה", createdById: adminId, assigneeId: ids.INSTRUCTOR, dueDate: daysFromToday(5) },
      { ...o, title: "[Demo] משימה באיחור", createdById: adminId, assigneeId: ids.INSTRUCTOR, dueDate: daysFromToday(-2), priority: "HIGH" },
      { ...o, title: "[Demo] משימה שהושלמה", createdById: adminId, status: "COMPLETED", completedAt: new Date() },
    ],
  });

  console.log(`Demo data created. Sign in as admin@demo.local / ${DEMO_PASSWORD} (development only).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
