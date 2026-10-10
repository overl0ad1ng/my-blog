export const MILLISECONDS_PER_DAY = 86_400_000;

const beijingDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatBeijingDate(date: Date): string {
  return beijingDateFormatter.format(date);
}
