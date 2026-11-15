import { describe, expect, it } from "vitest";
import { EquipmentInput } from "@/modules/equipment/schema";

describe("EquipmentInput — נדרש לרכישה", () => {
  it("takes the name from the model when only category, model and notes are given", () => {
    const r = EquipmentInput.parse({ procurement: "TO_ORDER", category: "מדפסות", model: "Bambu X2D", notes: "2 יחידות" });
    expect(r.name).toBe("Bambu X2D");
  });

  it("falls back to the category when there is no model", () => {
    const r = EquipmentInput.parse({ procurement: "TO_ORDER", category: "מדפסות" });
    expect(r.name).toBe("מדפסות");
  });

  it("still requires a name for equipment in service", () => {
    expect(EquipmentInput.safeParse({ procurement: "IN_SERVICE", category: "מדפסות", model: "X" }).success).toBe(false);
  });
});
