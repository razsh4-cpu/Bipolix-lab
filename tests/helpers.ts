import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "./global-setup";

export function testDb() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) });
}

export async function createOrgWithAdmin(db: PrismaClient) {
  const suffix = randomUUID().slice(0, 8);
  const org = await db.organization.create({ data: { name: `Org ${suffix}`, slug: `org-${suffix}` } });
  const user = await db.user.create({
    data: { id: randomUUID(), name: "Admin", email: `admin-${suffix}@test.local` },
  });
  await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
  return { org, user };
}
