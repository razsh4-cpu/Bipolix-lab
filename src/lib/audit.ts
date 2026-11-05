import type { Prisma } from "@/generated/prisma/client";

type AuditEntry = {
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
};

// Call inside the same transaction as the change it records.
export function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  return tx.auditLog.create({ data: entry });
}
