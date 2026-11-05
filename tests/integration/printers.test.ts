import { afterAll, describe, expect, it } from "vitest";
import type { NormalizedPrinterStatus } from "@/integrations/printer-status";
import { createEquipment } from "@/modules/equipment/service";
import { createBridgeToken, ingestBridgeReport, linkPrinter, printerJobSummary, revokeBridgeToken } from "@/modules/printers/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const status = (over: Partial<NormalizedPrinterStatus> = {}): NormalizedPrinterStatus => ({
  state: "IDLE", jobName: null, progressPercent: null, remainingMinutes: null, layer: null, totalLayers: null,
  nozzleTemps: [], bedTemp: null, chamberTemp: null, hmsAlerts: [], filaments: [], ...over,
});
const report = (serial: string, at: string, s: NormalizedPrinterStatus | null, online = true) => ({
  printers: [{ serial, online, reportedAt: at, status: s }],
});

async function setup(serial = "SERIAL0001") {
  const { org, user } = await createOrgWithAdmin(db);
  const actor = { organizationId: org.id, userId: user.id };
  const equipment = await createEquipment(db, actor, { name: "X2D", category: "3D" });
  const link = await linkPrinter(db, actor, equipment.id, serial);
  const { token, id } = await createBridgeToken(db, actor, "truck");
  return { org, actor, equipment, link, token, tokenId: id };
}

describe("printer bridge ingest", () => {
  it("stores status for linked printers and reports unknown serials", async () => {
    const { token, link } = await setup();
    const res = await ingestBridgeReport(db, token, {
      printers: [
        { serial: "SERIAL0001", online: true, reportedAt: "2026-10-25T10:00:00Z", status: status({ state: "RUNNING", progressPercent: 40 }) },
        { serial: "UNKNOWN999", online: true, reportedAt: "2026-10-25T10:00:00Z", status: null },
      ],
    });
    expect(res).toEqual({ updated: ["SERIAL0001"], unknown: ["UNKNOWN999"] });
    const s = await db.printerStatus.findUniqueOrThrow({ where: { printerLinkId: link.id } });
    expect(s.progressPercent).toBe(40);
  });

  it("only stores a SHA-256 hash and rejects bad or revoked tokens", async () => {
    const { token, tokenId, actor } = await setup();
    const row = await db.bridgeToken.findUniqueOrThrow({ where: { id: tokenId } });
    expect(row.tokenHash).not.toContain(token);
    expect(await ingestBridgeReport(db, "lob_wrong", report("SERIAL0001", "2026-10-25T10:00:00Z", null))).toBeNull();
    await revokeBridgeToken(db, actor, tokenId);
    expect(await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:00:00Z", null))).toBeNull();
  });

  it("cannot update another organization's printer with the same serial", async () => {
    const a = await setup("SHARED0001");
    const b = await setup("SHARED0001");
    await ingestBridgeReport(db, a.token, report("SHARED0001", "2026-10-25T10:00:00Z", status({ state: "RUNNING" })));
    expect(await db.printerStatus.findUnique({ where: { printerLinkId: b.link.id } })).toBeNull();
  });

  it("ignores reports older than the stored one", async () => {
    const { token, link } = await setup();
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:05:00Z", status({ state: "RUNNING" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:00:00Z", status({ state: "IDLE" })));
    expect((await db.printerStatus.findUniqueOrThrow({ where: { printerLinkId: link.id } })).state).toBe("RUNNING");
  });

  it("keeps the last status when the printer goes offline", async () => {
    const { token, link } = await setup();
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:00:00Z", status({ state: "RUNNING", progressPercent: 70 })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:01:00Z", null, false));
    const s = await db.printerStatus.findUniqueOrThrow({ where: { printerLinkId: link.id } });
    expect(s).toMatchObject({ online: false, state: "RUNNING", progressPercent: 70 });
  });

  it("records a finished job with its duration and counts print hours", async () => {
    const { token, link, org } = await setup();
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T08:00:00Z", status({ state: "RUNNING", jobName: "bracket" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T09:00:00Z", status({ state: "RUNNING", jobName: "bracket" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T09:30:00Z", status({ state: "FINISH", jobName: "bracket" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T09:31:00Z", status({ state: "FINISH" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:00:00Z", status({ state: "RUNNING", jobName: "gear" })));
    await ingestBridgeReport(db, token, report("SERIAL0001", "2026-10-25T10:30:00Z", status({ state: "FAILED" })));
    const jobs = await db.printerJob.findMany({ where: { printerLinkId: link.id }, orderBy: { startedAt: "asc" } });
    expect(jobs.map((j) => [j.jobName, j.result])).toEqual([["bracket", "FINISHED"], ["gear", "FAILED"]]);
    const summary = await printerJobSummary(db, org.id, new Date("2026-10-25T00:00:00Z"));
    expect(summary.get(link.id)).toEqual({ finished: 1, failed: 1, totalHours: 2 });
  });

  it("refuses to link the same serial to two machines in one organization", async () => {
    const { actor } = await setup("DUPL000001");
    const other = await createEquipment(db, actor, { name: "X2D #2", category: "3D" });
    await expect(linkPrinter(db, actor, other.id, "DUPL000001")).rejects.toThrow("המספר הסידורי כבר מחובר לציוד אחר");
  });
});
