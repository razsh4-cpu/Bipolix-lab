import { describe, expect, it } from "vitest";
import { can, PERMISSIONS } from "@/lib/permissions";

describe("permissions matrix", () => {
  it("lets every role view the dashboard", () => {
    expect(can("ADMIN", "dashboard.view")).toBe(true);
    expect(can("INSTRUCTOR", "dashboard.view")).toBe(true);
    expect(can("VIEWER", "dashboard.view")).toBe(true);
  });

  it("never lets an instructor manage users or return equipment to service", () => {
    expect(can("INSTRUCTOR", "users.manage")).toBe(false);
    expect(can("INSTRUCTOR", "equipment.returnToService")).toBe(false);
    expect(can("INSTRUCTOR", "fault.manage")).toBe(false);
  });

  it("lets instructors report faults and issue stock", () => {
    expect(can("INSTRUCTOR", "fault.report")).toBe(true);
    expect(can("INSTRUCTOR", "inventory.issue")).toBe(true);
  });

  it("gives viewers no write permission at all", () => {
    const writable = Object.keys(PERMISSIONS).filter(
      (p) => !p.endsWith(".view") && can("VIEWER", p as keyof typeof PERMISSIONS),
    );
    expect(writable).toEqual([]);
  });
});
