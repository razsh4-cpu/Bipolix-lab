import type { PrismaClient } from "@/generated/prisma/client";
import type { LabDocumentCategory } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import { documentPrefix, type LabDocumentDetails } from "./schema";

export const LAB_DOCUMENT_CATEGORY_ORDER: LabDocumentCategory[] = ["AUTHORITIES", "EQUIPMENT", "GENERAL"];

export type StoredFile = { fileName: string; blobPathname: string; contentType: string; sizeBytes: number };

export function listLabDocuments(db: PrismaClient, organizationId: string) {
  return db.labDocument.findMany({
    where: { organizationId },
    orderBy: [{ documentDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      documentDate: true,
      notes: true,
      fileName: true,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });
}

export function getLabDocument(db: PrismaClient, organizationId: string, id: string) {
  return db.labDocument.findFirst({ where: { id, organizationId } });
}

export async function createLabDocument(db: PrismaClient, actor: Actor, details: LabDocumentDetails, file: StoredFile) {
  if (!file.blobPathname.startsWith(documentPrefix(actor.organizationId))) throw new DomainError("הקובץ לא שייך לארגון");
  return db.$transaction(async (tx) => {
    const doc = await tx.labDocument.create({
      data: { ...details, ...file, organizationId: actor.organizationId, uploadedById: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "document.create",
      entityType: "LabDocument",
      entityId: doc.id,
    });
    return doc;
  });
}

// Removes the record and returns the blob pathname so the caller can delete the file.
export function deleteLabDocument(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.labDocument.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("המסמך לא נמצא");
    await tx.labDocument.delete({ where: { id } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "document.delete",
      entityType: "LabDocument",
      entityId: id,
      details: { title: existing.title, fileName: existing.fileName },
    });
    return existing.blobPathname;
  });
}
