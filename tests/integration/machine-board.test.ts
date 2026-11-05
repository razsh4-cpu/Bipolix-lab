import { afterAll, describe, expect, it } from "vitest";
import { getMachineBoard } from "@/modules/dashboard/machine-board";
import { createEquipment } from "@/modules/equipment/service";
import { createMaintenancePlan, reportFault, updateFault } from "@/modules/maintenance/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("fault handling and machine board", () => {
  it("logs every fault update with handler and target date, append-only", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const e = await createEquipment(db, actor, { name: "CNC", category: "CNC" });
    const fault = await reportFault(db, actor, { equipmentId: e.id, severity: "HIGH", description: "spindle noise" });

    await updateFault(db, actor, fault.id, { status: "WAITING_FOR_PARTS", handledBy: "ספק", expectedFixAt: day("2026-11-03"), note: "הוזמן מיסב" });
    await updateFault(db, actor, fault.id, { status: "WAITING_FOR_PARTS", handledBy: "ספק", expectedFixAt: day("2026-11-03") });
    await updateFault(db, actor, fault.id, { status: "WAITING_FOR_PARTS", handledBy: "ספק", expectedFixAt: day("2026-11-03"), note: "המיסב הגיע" });

    const f = await db.faultReport.findUniqueOrThrow({ where: { id: fault.id }, include: { updates: { orderBy: { createdAt: "asc" } } } });
    expect(f).toMatchObject({ handledBy: "ספק", expectedFixAt: day("2026-11-03") });
    // The no-op second update is not logged.
    expect(f.updates.map((u) => [u.fromStatus, u.toStatus, u.note])).toEqual([
      ["OPEN", "WAITING_FOR_PARTS", "הוזמן מיסב"],
      [null, null, "המיסב הגיע"],
    ]);
    await expect(db.faultUpdate.delete({ where: { id: f.updates[0].id } })).rejects.toThrow();
  });

  it("puts unavailable machines first and explains why", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const ok = await createEquipment(db, actor, { name: "A ok", category: "x" });
    const broken = await createEquipment(db, actor, { name: "B broken", category: "x" });
    const noisy = await createEquipment(db, actor, { name: "C noisy", category: "x" });
    const late = await createEquipment(db, actor, { name: "D late", category: "x" });
    await reportFault(db, actor, { equipmentId: broken.id, severity: "CRITICAL", description: "smoke" });
    await reportFault(db, actor, { equipmentId: noisy.id, severity: "LOW", description: "noise" });
    await createMaintenancePlan(db, actor, { equipmentId: late.id, title: "Belt check", nextDueAt: day("2026-10-01"), source: "ADMIN" });

    const board = await getMachineBoard(db, org.id, new Date("2026-10-25T12:00:00Z"));
    expect(board.map((m) => [m.name, m.condition])).toEqual([
      ["B broken", "down"],
      ["C noisy", "attention"],
      ["D late", "attention"],
      ["A ok", "ok"],
    ]);
    expect(board[0].faultReports[0].description).toBe("smoke");
    expect(board[2].plans[0].title).toBe("Belt check");
    expect(board.find((m) => m.id === ok.id)?.faultReports).toEqual([]);
  });
});
