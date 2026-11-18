import { afterAll, describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { LabDocumentDetails, documentPrefix } from "@/modules/documents/schema";
import { createLabDocument, deleteLabDocument, getLabDocument, listLabDocuments } from "@/modules/documents/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const file = (orgId: string, name = "a.pdf") => ({
  fileName: name,
  blobPathname: `${documentPrefix(orgId)}${name}-x1`,
  contentType: "application/pdf",
  sizeBytes: 1234,
});

describe("lab documents", () => {
  it("everyone views, only admins upload; title and category are required", () => {
    expect(can("VIEWER", "document.view")).toBe(true);
    expect(can("INSTRUCTOR", "document.manage")).toBe(false);
    expect(can("ADMIN", "document.manage")).toBe(true);
    expect(LabDocumentDetails.safeParse({ category: "GENERAL" }).success).toBe(false);
    expect(LabDocumentDetails.safeParse({ title: "x", category: "NOPE" }).success).toBe(false);
  });

  it("stores, lists and deletes within one organization", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actor = { organizationId: a.org.id, userId: a.user.id };
    const doc = await createLabDocument(db, actor, { title: "ציוד צפוי", category: "EQUIPMENT", documentDate: new Date("2026-11-01T00:00:00Z") }, file(a.org.id));
    expect(await listLabDocuments(db, a.org.id)).toHaveLength(1);
    expect(await listLabDocuments(db, b.org.id)).toEqual([]);
    expect(await getLabDocument(db, b.org.id, doc.id)).toBeNull();

    // A file under another organization's prefix is refused.
    await expect(createLabDocument(db, actor, { title: "x", category: "GENERAL" }, file(b.org.id))).rejects.toThrow("הקובץ לא שייך לארגון");

    const bActor = { organizationId: b.org.id, userId: b.user.id };
    await expect(deleteLabDocument(db, bActor, doc.id)).rejects.toThrow("המסמך לא נמצא");
    expect(await deleteLabDocument(db, actor, doc.id)).toBe(file(a.org.id).blobPathname);
    expect(await listLabDocuments(db, a.org.id)).toEqual([]);
  });
});
