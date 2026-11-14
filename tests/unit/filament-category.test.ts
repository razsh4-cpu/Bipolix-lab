import { describe, expect, it } from "vitest";
import { defaultUnitFor, isFilamentCategory, resolveNewItemFields } from "@/modules/inventory/schema";

describe("isFilamentCategory", () => {
  it("asks for a colour only for printing filament", () => {
    expect(isFilamentCategory("פילמנט")).toBe(true);
    expect(isFilamentCategory("פילמנט PLA")).toBe(true);
    expect(isFilamentCategory("Filament")).toBe(true);
    expect(isFilamentCategory("להבים")).toBe(false);
    expect(isFilamentCategory("")).toBe(false);
  });
});

describe("defaultUnitFor", () => {
  it("counts filament in spools and everything else in units", () => {
    expect(defaultUnitFor("גלילי פילמנט")).toBe("גליל");
    expect(defaultUnitFor("להבים")).toBe("יח'");
  });
});

describe("resolveNewItemFields", () => {
  it("names a filament spool by its type and files it under filament", () => {
    const r = resolveNewItemFields({ itemKind: "filament", materialType: "PETG", initialQuantity: "2" });
    expect(r).toEqual({
      ok: true,
      fields: { name: "גליל פילמנט PETG", category: "גלילי פילמנט", unit: "גליל", initialQuantity: "2" },
    });
  });

  it("requires a spool type", () => {
    const r = resolveNewItemFields({ itemKind: "filament" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.issues[0].path).toEqual(["materialType"]);
    expect(resolveNewItemFields({ itemKind: "filament", materialType: "ABS" }).ok).toBe(false);
  });

  it("puts other items in the general category", () => {
    expect(resolveNewItemFields({ itemKind: "other", name: "להבים" })).toEqual({
      ok: true,
      fields: { name: "להבים", category: "כללי", unit: "יח'" },
    });
  });
});
