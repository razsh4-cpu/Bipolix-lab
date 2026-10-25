export const APP_TIME_ZONE = "Asia/Jerusalem";

// Midnight (UTC) of the current calendar day in the app time zone.
// Matches how PostgreSQL DATE columns are compared by Prisma.
export function startOfToday(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}
