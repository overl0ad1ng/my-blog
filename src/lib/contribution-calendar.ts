import { getUTCDate, MILLISECONDS_PER_DAY } from "./date-utils";

export { getUTCDate } from "./date-utils";

export type ClassificationStatus = "complete" | "unavailable";

export const FIRST_CONTRIBUTION_YEAR = 2008;
const RECENT_WEEKS = 52;
const DAYS_PER_WEEK = 7;

export type ContributionDay = {
  date: string;
  total: number;
} & (
  | { github: number; documentation: number }
  | { github: null; documentation: null }
);

export interface ContributionYear {
  year: number;
  days: ContributionDay[];
  classification: ClassificationStatus;
}

export type ContributionInitialData =
  | { status: "ready"; contributions: ContributionYear }
  | { status: "unconfigured" | "error"; year: number };

export function isContributionYear(year: number, currentYear: number): boolean {
  return Number.isInteger(year) && year >= FIRST_CONTRIBUTION_YEAR && year <= currentYear;
}

export function getContributionTone(day: ContributionDay) {
  if (!day.total) return "empty";
  // The total is still verified GitHub activity even when the documentation
  // partition cannot be read. Keep its blue intensity instead of gray/white.
  if (day.documentation === null) return "github";
  if (day.documentation && day.github) return "mixed";
  return day.documentation ? "documentation" : "github";
}

export function getContributionLevel(total: number): number {
  if (total === 0) return 0;
  if (total <= 3) return 1;
  if (total <= 6) return 2;
  if (total <= 9) return 3;
  return 4;
}

export function makeCalendarDays(year: number, today: string): string[] {
  return makeDateRange(`${year}-01-01`, getContributionYearRange(year, today).lastDate);
}

export function getContributionYearRange(year: number, today: string) {
  const lastDate = today < `${year}-12-31` ? today : `${year}-12-31`;
  return { lastDate, from: `${year}-01-01T00:00:00Z`, to: `${lastDate}T23:59:59Z` };
}

export function getRecentContributionRange(today: string) {
  const end = new Date(`${today}T00:00:00Z`);
  const precedingDays = end.getUTCDay() + RECENT_WEEKS * DAYS_PER_WEEK;
  const start = new Date(end.getTime() - precedingDays * MILLISECONDS_PER_DAY);
  return { start: getUTCDate(start), end: today };
}

export function makeRecentContributions(today: string, years: ContributionYear[]): ContributionYear {
  const { start } = getRecentContributionRange(today);
  const lookup = new Map(years.flatMap((year) => year.days.map((day) => [day.date, day] as const)));
  const days = makeDateRange(start, today).map((date) => {
    const day = lookup.get(date);
    if (!day) throw new Error("The recent contribution range is incomplete.");
    return day;
  });
  return {
    year: Number(today.slice(0, 4)),
    days,
    classification: days.every((day) => day.documentation !== null) ? "complete" : "unavailable",
  };
}

export function mergeContributionDays(
  year: number,
  today: string,
  totals: Map<string, number>,
  documentation: Map<string, number> | null,
): ContributionYear {
  const days = makeCalendarDays(year, today).map((date): ContributionDay => {
    const total = totals.get(date);
    if (total === undefined) throw new Error("The contribution calendar is incomplete.");
    const writing = documentation?.get(date) ?? 0;
    // Never clamp a disagreement into a seemingly valid classification.
    if (documentation === null || writing < 0 || writing > total) {
      return { date, total, documentation: null, github: null };
    }
    return { date, total, documentation: writing, github: total - writing };
  });
  const complete = documentation !== null && days.every((day) => day.documentation !== null);
  return { year, days, classification: complete ? "complete" : "unavailable" };
}

export function touchesDocumentation(files: { filename: string; previous_filename?: string }[]): boolean {
  const matches = (filename: string) => filename.startsWith("src/content/") && filename.endsWith(".mdx");
  return files.some((file) => matches(file.filename) || (file.previous_filename !== undefined && matches(file.previous_filename)));
}

function makeDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const lastTime = Date.parse(`${end}T00:00:00Z`);
  for (let time = Date.parse(`${start}T00:00:00Z`); time <= lastTime; time += MILLISECONDS_PER_DAY) {
    dates.push(getUTCDate(new Date(time)));
  }
  return dates;
}
