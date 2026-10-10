export const MILLISECONDS_PER_DAY = 86_400_000;

export function getUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
