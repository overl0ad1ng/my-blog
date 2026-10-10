import { fetchDailyContributionTotals, type GitHubContributionConfig } from "./github-client";
import { FIRST_CONTRIBUTION_YEAR } from "./contribution-calendar";
import { getUTCDate, MILLISECONDS_PER_DAY } from "./date-utils";

export async function fetchCurrentStreak(config: GitHubContributionConfig, today: string, fetcher: typeof fetch = fetch) {
  let time = Date.parse(`${today}T00:00:00Z`);
  let currentStreak = 0;
  let loadedYear: number | null = null;
  let totals = new Map<string, number>();

  // GitHub launched in 2008; do not truncate at the recent calendar's window.
  while (time >= Date.UTC(FIRST_CONTRIBUTION_YEAR, 0, 1)) {
    const day = new Date(time);
    const date = getUTCDate(day);
    const year = day.getUTCFullYear();

    if (loadedYear !== year) {
      totals = await fetchDailyContributionTotals(config, year, today, fetcher);
      loadedYear = year;
    }

    const count = totals.get(date);

    if (count === undefined) throw new Error("Incomplete GitHub contribution calendar.");

    if (count > 0) currentStreak++;
    else if (date !== today) break;

    time -= MILLISECONDS_PER_DAY;
  }

  return currentStreak;
}
