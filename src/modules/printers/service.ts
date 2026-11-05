import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { BridgeReport } from "@/integrations/printer-status";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";

// A status older than this is shown as "no recent update".
export const STALE_AFTER_MS = 2 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createBridgeToken(db: PrismaClient, actor: Actor, name: string) {
  const token = `lob_${randomBytes(32).toString("base64url")}`;
  const row = await db.$transaction(async (tx) => {
    const created = await tx.bridgeToken.create({
      data: { organizationId: actor.organizationId, name, tokenHash: hashToken(token), createdById: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "bridgeToken.create",
      entityType: "BridgeToken",
      entityId: created.id,
      details: { name },
    });
    return created;
  });
  // The plain token is returned once and never stored.
  return { id: row.id, token };
}

export function revokeBridgeToken(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.bridgeToken.findFirst({ where: { id, organizationId: actor.organizationId, revokedAt: null } });
    if (!row) throw new DomainError("המפתח לא נמצא");
    await tx.bridgeToken.update({ where: { id }, data: { revokedAt: new Date() } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "bridgeToken.revoke",
      entityType: "BridgeToken",
      entityId: id,
    });
  });
}

export function listBridgeTokens(db: PrismaClient, organizationId: string) {
  return db.bridgeToken.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, lastSeenAt: true, revokedAt: true, createdBy: { select: { name: true } } },
  });
}

export function linkPrinter(db: PrismaClient, actor: Actor, equipmentId: string, serialNumber: string) {
  return db.$transaction(async (tx) => {
    const equipment = await tx.equipment.findFirst({ where: { id: equipmentId, organizationId: actor.organizationId, archivedAt: null } });
    if (!equipment) throw new DomainError("הציוד לא נמצא");
    const taken = await tx.printerLink.findFirst({ where: { organizationId: actor.organizationId, serialNumber } });
    if (taken && taken.equipmentId !== equipmentId) throw new DomainError("המספר הסידורי כבר מחובר לציוד אחר");
    const link = await tx.printerLink.upsert({
      where: { equipmentId },
      create: { organizationId: actor.organizationId, equipmentId, vendor: "BAMBU_LAB", serialNumber },
      update: { serialNumber },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "printer.link",
      entityType: "Equipment",
      entityId: equipmentId,
      details: { serialNumber },
    });
    return link;
  });
}

export function unlinkPrinter(db: PrismaClient, actor: Actor, equipmentId: string) {
  return db.$transaction(async (tx) => {
    const link = await tx.printerLink.findFirst({ where: { equipmentId, organizationId: actor.organizationId } });
    if (!link) throw new DomainError("המדפסת לא מחוברת");
    await tx.printerLink.delete({ where: { id: link.id } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "printer.unlink",
      entityType: "Equipment",
      entityId: equipmentId,
      details: { serialNumber: link.serialNumber },
    });
  });
}

const ACTIVE_STATES = new Set(["PREPARE", "SLICING", "RUNNING", "PAUSE"]);
type PreviousStatus = { state: string | null; jobStartedAt: Date | null; jobName: string | null } | null;

function nextJobStart(prev: PreviousStatus, state: string | null, at: Date): Date | null {
  if (!state || !ACTIVE_STATES.has(state)) return null;
  return prev?.jobStartedAt && prev.state && ACTIVE_STATES.has(prev.state) ? prev.jobStartedAt : at;
}

// A job ends when an active printer reports FINISH or FAILED.
export function finishedJob(prev: PreviousStatus, state: string | null, at: Date) {
  if (!prev?.jobStartedAt || !prev.state || !ACTIVE_STATES.has(prev.state)) return null;
  if (state !== "FINISH" && state !== "FAILED") return null;
  return {
    jobName: prev.jobName,
    startedAt: prev.jobStartedAt,
    endedAt: at,
    result: state === "FINISH" ? ("FINISHED" as const) : ("FAILED" as const),
  };
}

export type IngestResult = { updated: string[]; unknown: string[] };

// Stores the latest status per printer. Serials are matched only inside the
// token's own organization, and an older report never overwrites a newer one.
export async function ingestBridgeReport(db: PrismaClient, token: string, report: BridgeReport): Promise<IngestResult | null> {
  const bridge = await db.bridgeToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!bridge || bridge.revokedAt) return null;

  const links = await db.printerLink.findMany({
    where: { organizationId: bridge.organizationId, serialNumber: { in: report.printers.map((p) => p.serial) } },
    include: { status: { select: { reportedAt: true, state: true, jobStartedAt: true, jobName: true } } },
  });
  const bySerial = new Map(links.map((l) => [l.serialNumber, l]));
  const result: IngestResult = { updated: [], unknown: [] };

  for (const p of report.printers) {
    const link = bySerial.get(p.serial);
    if (!link) {
      result.unknown.push(p.serial);
      continue;
    }
    const reportedAt = new Date(p.reportedAt);
    if (link.status && link.status.reportedAt > reportedAt) continue;

    const statusFields: Omit<Prisma.PrinterStatusUncheckedCreateInput, "printerLinkId" | "online" | "reportedAt"> = p.status
      ? {
          state: p.status.state,
          jobName: p.status.jobName,
          progressPercent: p.status.progressPercent,
          remainingMinutes: p.status.remainingMinutes,
          layer: p.status.layer,
          totalLayers: p.status.totalLayers,
          nozzleTemps: p.status.nozzleTemps,
          bedTemp: p.status.bedTemp,
          chamberTemp: p.status.chamberTemp,
          hmsAlerts: p.status.hmsAlerts,
          filaments: p.status.filaments,
          jobStartedAt: nextJobStart(link.status, p.status.state, reportedAt),
        }
      : {};
    await db.$transaction(async (tx) => {
      const finished = p.status && finishedJob(link.status, p.status.state, reportedAt);
      if (finished) await tx.printerJob.create({ data: { printerLinkId: link.id, ...finished } });
      await tx.printerStatus.upsert({
        where: { printerLinkId: link.id },
        create: { printerLinkId: link.id, online: p.online, reportedAt, ...statusFields },
        update: { online: p.online, reportedAt, ...statusFields },
      });
    });
    result.updated.push(p.serial);
  }

  await db.bridgeToken.update({ where: { id: bridge.id }, data: { lastSeenAt: new Date() } });
  return result;
}

// Print jobs that ended since `since`, and total print hours, per printer.
export async function printerJobSummary(db: PrismaClient, organizationId: string, since: Date) {
  const jobs = await db.printerJob.findMany({
    where: { printerLink: { organizationId }, endedAt: { gte: since } },
    select: { printerLinkId: true, result: true, startedAt: true, endedAt: true },
  });
  const totals = await db.$queryRaw<{ printerLinkId: string; hours: number }[]>`
    SELECT j."printerLinkId", (SUM(EXTRACT(EPOCH FROM (j."endedAt" - j."startedAt"))) / 3600)::float8 AS "hours"
    FROM "PrinterJob" j JOIN "PrinterLink" l ON l."id" = j."printerLinkId"
    WHERE l."organizationId" = ${organizationId}
    GROUP BY j."printerLinkId"`;
  const out = new Map<string, { finished: number; failed: number; totalHours: number }>();
  for (const t of totals) out.set(t.printerLinkId, { finished: 0, failed: 0, totalHours: Math.round(t.hours * 10) / 10 });
  for (const j of jobs) {
    const row = out.get(j.printerLinkId) ?? { finished: 0, failed: 0, totalHours: 0 };
    if (j.result === "FINISHED") row.finished++;
    else row.failed++;
    out.set(j.printerLinkId, row);
  }
  return out;
}

export function listPrinters(db: PrismaClient, organizationId: string) {
  return db.printerLink.findMany({
    where: { organizationId, equipment: { archivedAt: null } },
    orderBy: { equipment: { name: "asc" } },
    include: { status: true, equipment: { select: { id: true, name: true, status: true } } },
  });
}
