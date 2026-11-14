import { describe, expect, it } from "vitest";
import { expandOccurrences, occurrenceDates } from "@/modules/activities/recurrence";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const ymd = (ds: Date[]) => ds.map((x) => x.toISOString().slice(0, 10));

describe("occurrenceDates", () => {
  it("shows a one-off activity only on its day", () => {
    const a = { date: d("2026-11-15"), recurrence: "NONE" as const, recurrenceUntil: null };
    expect(ymd(occurrenceDates(a, d("2026-11-01"), d("2026-11-30")))).toEqual(["2026-11-15"]);
    expect(occurrenceDates(a, d("2026-12-01"), d("2026-12-31"))).toEqual([]);
  });
  it("repeats daily from its start until the end date", () => {
    const a = { date: d("2026-11-15"), recurrence: "DAILY" as const, recurrenceUntil: d("2026-11-18") };
    expect(ymd(occurrenceDates(a, d("2026-11-01"), d("2026-11-30")))).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"]);
  });
  it("repeats weekly on the same weekday, starting inside the range", () => {
    const a = { date: d("2026-11-03"), recurrence: "WEEKLY" as const, recurrenceUntil: null }; // Tuesday
    expect(ymd(occurrenceDates(a, d("2026-11-15"), d("2026-12-01")))).toEqual(["2026-11-17", "2026-11-24", "2026-12-01"]);
  });
  it("expands to one row per day, sorted by day and time", () => {
    const rows = [
      { id: "w", date: d("2026-11-16"), recurrence: "WEEKLY" as const, recurrenceUntil: null, startTime: "08:00" },
      { id: "o", date: d("2026-11-16"), recurrence: "NONE" as const, recurrenceUntil: null, startTime: "07:00" },
    ];
    const out = expandOccurrences(rows, d("2026-11-16"), d("2026-11-23"));
    expect(out.map((r) => `${r.id}@${r.date.toISOString().slice(0, 10)}`)).toEqual(["o@2026-11-16", "w@2026-11-16", "w@2026-11-23"]);
  });
});
