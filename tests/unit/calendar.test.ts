import { describe, expect, it } from "vitest";
import { addMonths, hourRange, layoutDay, parseDay, parseView, shiftDate, toYmd, viewTitle, visibleRange } from "@/modules/activities/calendar";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const fallback = d("2026-11-14");

describe("calendar query values", () => {
  it("defaults to the month view and today", () => {
    expect(parseView(undefined)).toBe("month");
    expect(parseView("week")).toBe("week");
    expect(parseView("year")).toBe("month");
    expect(parseDay("2026-02-30", fallback)).toBe(fallback);
    expect(parseDay("nope", fallback)).toBe(fallback);
    expect(toYmd(parseDay("2026-12-01", fallback))).toBe("2026-12-01");
  });
});

describe("visibleRange", () => {
  it("shows full Sunday-to-Saturday weeks around the month", () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const r = visibleRange("month", d("2026-11-14"));
    expect([toYmd(r.from), toYmd(r.to)]).toEqual(["2026-11-01", "2026-12-05"]);
  });
  it("starts the week on Sunday", () => {
    const r = visibleRange("week", d("2026-11-14")); // Saturday
    expect([toYmd(r.from), toYmd(r.to)]).toEqual(["2026-11-08", "2026-11-14"]);
  });
  it("moves by a month without overflowing short months", () => {
    expect(toYmd(addMonths(d("2026-01-31"), 1))).toBe("2026-02-28");
    expect(toYmd(shiftDate("week", d("2026-11-14"), -1))).toBe("2026-11-07");
    expect(toYmd(shiftDate("day", d("2026-11-30"), 1))).toBe("2026-12-01");
  });
  it("titles the views in Hebrew", () => {
    expect(viewTitle("month", d("2026-11-14"))).toBe("נובמבר 2026");
    expect(viewTitle("week", d("2026-11-14"))).toBe("8–14 בנובמבר 2026");
  });
});

describe("time grid", () => {
  const ev = (id: string, startTime: string | null, endTime: string | null = null) => ({ id, startTime, endTime });
  it("widens the default hours to fit early and late activities", () => {
    expect(hourRange([ev("a", "09:00", "12:00")])).toEqual({ first: 7, last: 20 });
    expect(hourRange([ev("a", "06:30", "08:00"), ev("b", "20:00", "21:15")])).toEqual({ first: 6, last: 22 });
  });
  it("puts overlapping activities side by side", () => {
    const out = layoutDay([ev("a", "09:00", "11:00"), ev("b", "10:00", null), ev("c", "12:00", "13:00")] as { id: string; startTime: string; endTime: string | null }[]);
    const byId = Object.fromEntries(out.map((o) => [o.event.id, o]));
    expect([byId.a.column, byId.b.column, byId.a.columns]).toEqual([0, 1, 2]);
    expect([byId.b.start, byId.b.end]).toEqual([600, 660]);
    expect([byId.c.column, byId.c.columns]).toEqual([0, 1]);
  });
});
