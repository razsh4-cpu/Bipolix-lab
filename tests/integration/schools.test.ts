import { afterAll, describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { PrintRequestInput } from "@/modules/schools/schema";
import {
  createPrintRequest,
  createSchool,
  listSchoolsWithRequests,
  renameSchool,
  setPrintRequestStatus,
  updatePrintRequest,
} from "@/modules/schools/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("school print requests", () => {
  it("only admins manage, everyone views", () => {
    expect(can("VIEWER", "school.view")).toBe(true);
    expect(can("INSTRUCTOR", "school.manage")).toBe(false);
    expect(can("ADMIN", "school.manage")).toBe(true);
  });

  it("validates the form: description required, whole quantity, link gets https://", () => {
    expect(PrintRequestInput.safeParse({ schoolId: "s", status: "PENDING" }).success).toBe(false);
    expect(PrintRequestInput.safeParse({ schoolId: "s", description: "x", quantity: "2.5", status: "PENDING" }).success).toBe(false);
    expect(PrintRequestInput.safeParse({ schoolId: "s", description: "x", filesUrl: "not a link", status: "PENDING" }).success).toBe(false);
    const ok = PrintRequestInput.parse({ schoolId: "s", description: "x", quantity: "12", filesUrl: "drive.google.com/drive/folders/abc", status: "PENDING" });
    expect(ok).toMatchObject({ quantity: 12, filesUrl: "https://drive.google.com/drive/folders/abc" });
  });

  it("adds schools and requests within one organization", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actor = { organizationId: a.org.id, userId: a.user.id };
    const school = await createSchool(db, actor, { name: "School A" });
    await expect(createSchool(db, actor, { name: "School A" })).rejects.toThrow("כבר קיים בית ספר בשם הזה");
    await renameSchool(db, actor, school.id, { name: "School A2" });

    const r = await createPrintRequest(db, actor, { schoolId: school.id, description: "Gears", quantity: 10, filesUrl: "https://example.com/f", status: "PENDING" });
    await setPrintRequestStatus(db, actor, r.id, "PRINTING");
    await updatePrintRequest(db, actor, r.id, { schoolId: school.id, description: "Gears", status: "PRINTED" });

    const [row] = await listSchoolsWithRequests(db, a.org.id);
    expect(row.name).toBe("School A2");
    expect(row.printRequests[0]).toMatchObject({ status: "PRINTED", quantity: null, filesUrl: null });
    expect(await listSchoolsWithRequests(db, b.org.id)).toEqual([]);

    const other = { organizationId: b.org.id, userId: b.user.id };
    await expect(createPrintRequest(db, other, { schoolId: school.id, description: "x", status: "PENDING" })).rejects.toThrow("בית הספר לא נמצא");
    await expect(setPrintRequestStatus(db, other, r.id, "DELIVERED")).rejects.toThrow("הבקשה לא נמצאה");
  });
});
