import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/dates";
import { DomainError, type Actor } from "@/modules/types";
import { expandOccurrences } from "./recurrence";
import type { ActivityInput } from "./schema";

const EMPTY = { startTime: null, endTime: null, audience: null, participants: null, notes: null, recurrenceUntil: null };

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
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const [todayRows, upcoming, lastPast] = await Promise.all([
    listActivitiesBetween(db, organizationId, today, today),
    listActivitiesBetween(db, organizationId, tomorrow, new Date(today.getTime() + 90 * 86_400_000)),
    db.activity.findFirst({ where: { organizationId, date: { lt: today }, status: "DONE" }, orderBy: [{ date: "desc" }, { startTime: "desc" }] }),
  ]);
  const todays = todayRows.filter((a) => a.status !== "CANCELLED");
  const next = upcoming.filter((a) => a.status === "PLANNED").slice(0, 5);
  return { today: todays, next, lastLocation: lastPast ? { location: lastPast.location, date: lastPast.date } : null };
}

// Past activities still marked as planned: the admin should mark them done or cancelled.
export function unconfirmedPastActivities(db: PrismaClient, organizationId: string, now = new Date()) {
  return db.activity.findMany({
    // Repeating activities stay "planned" as a series, so they are not flagged.
    where: { organizationId, date: { lt: startOfToday(now) }, status: "PLANNED", recurrence: "NONE" },
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

// Activities on the days a calendar view shows (inclusive), with repeating
// activities expanded to one row per day they occur.
export async function listActivitiesBetween(db: PrismaClient, organizationId: string, from: Date, to: Date) {
  const rows = await db.activity.findMany({
    where: {
      organizationId,
      OR: [
        { recurrence: "NONE", date: { gte: from, lte: to } },
        { recurrence: { not: "NONE" }, date: { lte: to }, OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: from } }] },
      ],
    },
    orderBy: ORDER,
  });
  return expandOccurrences(rows, from, to);
}
