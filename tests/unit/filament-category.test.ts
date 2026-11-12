import { describe, expect, it } from "vitest";
import { defaultUnitFor, isFilamentCategory } from "@/modules/inventory/schema";

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
