import "server-only";

import { cacheLife } from "next/cache";
import {
  getRecentContributionRange,
  isContributionYear,
  makeRecentContributions,
  type ContributionInitialData,
  type ContributionYear,
} from "./contribution-calendar";
import { getUTCDate } from "./date-utils";
import { fetchContributions, fetchContributionYears } from "./github-contributions";
import { getGitHubConfig, GitHubContributionError } from "./github-client";

export async function getContributionYears() {
  return getCachedYears(new Date().getUTCFullYear());
}

export async function getContributions(year: number) {
  const now = new Date();
  if (!isContributionYear(year, now.getUTCFullYear())) throw new GitHubContributionError();
  return getCachedContributions(year, getUTCDate(now));
}

export async function getInitialContributions(): Promise<ContributionInitialData> {
  const now = new Date();
  const year = now.getUTCFullYear();
  if (!getGitHubConfig()) return { status: "unconfigured", year };

  try {
    const contributions = await readRecentContributions(getUTCDate(now));
    return { status: "ready", contributions };
  } catch {
    return { status: "error", year };
  }
}

export async function getRecentContributions() {
  return readRecentContributions(getUTCDate(new Date()));
}

// Credentials stay inside cache scopes; date arguments invalidate at rollover.
async function getCachedYears(currentYear: number) {
  "use cache";
  cacheLife("days");
  const config = getGitHubConfig();
  if (!config) throw new GitHubContributionError();
  return fetchContributionYears(config, currentYear);
}

async function getCachedContributions(year: number, today: string) {
  "use cache";
  const config = getGitHubConfig();
  if (!config) throw new GitHubContributionError();
  const contributions = await fetchContributions(config, year, today);
  setContributionCacheLife(contributions, today);
  return contributions;
}

function setContributionCacheLife(contributions: ContributionYear, today: string) {
  // Failed classification should recover before a historical year's normal refresh.
  if (contributions.classification === "unavailable") return cacheLife("minutes");
  if (today.startsWith(`${contributions.year}-`)) return cacheLife("hours");
  cacheLife("days");
}

async function readRecentContributions(today: string) {
  const { start } = getRecentContributionRange(today);
  const firstYear = Number(start.slice(0, 4));
  const currentYear = Number(today.slice(0, 4));
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => firstYear + index);
  const contributions = await Promise.all(years.map((year) => getCachedContributions(year, today)));
  return makeRecentContributions(today, contributions);
}
