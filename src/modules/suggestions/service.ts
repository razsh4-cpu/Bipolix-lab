import type { PrismaClient } from "@/generated/prisma/client";
import type { SuggestionStatus } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { SuggestionInput, SuggestionReview } from "./schema";

// Open suggestions first (new, then planned), then the closed ones; newest first within each.
const STATUS_ORDER: Record<SuggestionStatus, number> = { NEW: 0, PLANNED: 1, DONE: 2, DECLINED: 3 };

export async function listSuggestions(db: PrismaClient, organizationId: string) {
  const rows = await db.suggestion.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      details: true,
      status: true,
      adminResponse: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export function createSuggestion(db: PrismaClient, actor: Actor, input: SuggestionInput) {
  return db.$transaction(async (tx) => {
    const suggestion = await tx.suggestion.create({
      data: { ...input, organizationId: actor.organizationId, authorId: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "suggestion.create",
      entityType: "Suggestion",
      entityId: suggestion.id,
    });
    return suggestion;
  });
}

export function reviewSuggestion(db: PrismaClient, actor: Actor, id: string, review: SuggestionReview) {
  return db.$transaction(async (tx) => {
    const existing = await tx.suggestion.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("ההצעה לא נמצאה");
    await tx.suggestion.update({ where: { id }, data: { status: review.status, adminResponse: review.adminResponse ?? null } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "suggestion.review",
      entityType: "Suggestion",
      entityId: id,
      details: { from: existing.status, to: review.status },
    });
  });
}
