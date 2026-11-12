import { afterAll, describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { SuggestionInput } from "@/modules/suggestions/schema";
import { createSuggestion, listSuggestions, reviewSuggestion } from "@/modules/suggestions/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("improvement suggestions", () => {
  it("lets every role suggest, and only admins review", () => {
    expect(can("VIEWER", "suggestion.create")).toBe(true);
    expect(can("INSTRUCTOR", "suggestion.create")).toBe(true);
    expect(can("INSTRUCTOR", "suggestion.manage")).toBe(false);
    expect(can("ADMIN", "suggestion.manage")).toBe(true);
    expect(SuggestionInput.safeParse({}).success).toBe(false);
  });

  it("lists open suggestions first and keeps organizations apart", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actor = { organizationId: a.org.id, userId: a.user.id };
    const done = await createSuggestion(db, actor, { title: "Done one" });
    await createSuggestion(db, actor, { title: "New one", details: "why" });
    await reviewSuggestion(db, actor, done.id, { status: "DONE", adminResponse: "Shipped" });

    const list = await listSuggestions(db, a.org.id);
    expect(list.map((s) => [s.title, s.status])).toEqual([["New one", "NEW"], ["Done one", "DONE"]]);
    expect(list[1].adminResponse).toBe("Shipped");
    expect(await listSuggestions(db, b.org.id)).toEqual([]);
    await expect(reviewSuggestion(db, { organizationId: b.org.id, userId: b.user.id }, done.id, { status: "DECLINED" })).rejects.toThrow("ההצעה לא נמצאה");
  });
});
