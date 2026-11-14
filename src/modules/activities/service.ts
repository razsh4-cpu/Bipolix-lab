import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/dates";
import { DomainError, type Actor } from "@/modules/types";
import type { ActivityInput } from "./schema";

const EMPTY = { startTime: null, endTime: null, audience: null, participants: null, notes: null };

export function createActivity(db: PrismaClient, actor: Actor, input: ActivityInput) {
  return db.$transaction(async (tx) => {
    const activity = await tx.activity.create({ data: { ...EMPTY, ...input, organizationId: actor.organizationId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "activity.create",
      entityType: "Activity",
      entityId: activity.id,
    });
    return activity;
  });
}

export function updateActivity(db: PrismaClient, actor: Actor, id: string, input: ActivityInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.activity.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הפעילות לא נמצאה");
    const activity = await tx.activity.update({ where: { id }, data: { ...EMPTY, ...input } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "activity.update",
      entityType: "Activity",
      entityId: id,
      details: existing.status !== input.status ? { from: existing.status, to: input.status } : undefined,
    });
    return activity;
  });
}

export function getActivity(db: PrismaClient, organizationId: string, id: string) {
  return db.activity.findFirst({ where: { id, organizationId } });
}

const ORDER = [{ date: "asc" as const }, { startTime: "asc" as const }];

export async function listActivities(db: PrismaClient, organizationId: string, now = new Date()) {
  const today = startOfToday(now);
  const [upcoming, past] = await Promise.all([
    db.activity.findMany({ where: { organizationId, date: { gte: today } }, orderBy: ORDER }),
    db.activity.findMany({ where: { organizationId, date: { lt: today } }, orderBy: [{ date: "desc" }, { startTime: "desc" }], take: 30 }),
  ]);
  return { upcoming, past };
}

// What the dashboard needs: today's activities (where the truck is) and the next ones.
export async function getTruckSchedule(db: PrismaClient, organizationId: string, now = new Date()) {
  const today = startOfToday(now);
  const [todays, next, lastPast] = await Promise.all([
    db.activity.findMany({ where: { organizationId, date: today, status: { not: "CANCELLED" } }, orderBy: ORDER }),
    db.activity.findMany({ where: { organizationId, date: { gt: today }, status: "PLANNED" }, orderBy: ORDER, take: 5 }),
    db.activity.findFirst({ where: { organizationId, date: { lt: today }, status: "DONE" }, orderBy: [{ date: "desc" }, { startTime: "desc" }] }),
  ]);
  return { today: todays, next, lastLocation: lastPast ? { location: lastPast.location, date: lastPast.date } : null };
}

// Past activities still marked as planned: the admin should mark them done or cancelled.
export function unconfirmedPastActivities(db: PrismaClient, organizationId: string, now = new Date()) {
  return db.activity.findMany({
    where: { organizationId, date: { lt: startOfToday(now) }, status: "PLANNED" },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true },
  });
}

export async function knownLocations(db: PrismaClient, organizationId: string) {
  const rows = await db.activity.findMany({
    where: { organizationId },
    distinct: ["location"],
    select: { location: true },
    orderBy: { location: "asc" },
    take: 100,
  });
  return rows.map((r) => r.location);
}

// Activities on the days a calendar view shows (inclusive).
export function listActivitiesBetween(db: PrismaClient, organizationId: string, from: Date, to: Date) {
  return db.activity.findMany({ where: { organizationId, date: { gte: from, lte: to } }, orderBy: ORDER });
}
