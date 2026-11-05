import { describe, expect, it } from "vitest";
import { startOfToday } from "@/lib/dates";

describe("startOfToday", () => {
  it("uses the Israel calendar day, not UTC", () => {
    // 23:30 UTC on Jan 1 is already Jan 2 in Israel (UTC+2).
    expect(startOfToday(new Date("2026-01-01T23:30:00Z")).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});
