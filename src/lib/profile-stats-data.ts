import { readFile } from "node:fs/promises";
import path from "node:path";

// Bump only when the word-counting rules change, not for other stats changes.
export const WORD_COUNT_VERSION = 1;

export interface ProfileStatsSnapshot {
  version: number;
  articles: {
    count: number;
    hashes: Record<string, string>;
    wordCounts: Record<string, number>;
    words: number;
  };
  projects: number;
  streak: { current: number | null; longest: number; asOf: string | null };
}

export function getProfileStatsDataPath() {
  const override = process.env.PROFILE_STATS_DATA_PATH;
  // Test snapshots are external runtime fixtures. The production default is
  // traced explicitly in next.config.ts; don't trace the project for an override.
  return override
    ? path.resolve(/* turbopackIgnore: true */ override)
    : path.join(process.cwd(), "src/content/data.json");
}

export function parseProfileStatsSnapshot(source: string): ProfileStatsSnapshot {
  const snapshot: unknown = JSON.parse(source);

  if (!isProfileStatsSnapshot(snapshot)) {
    throw new Error("Invalid profile stats snapshot; restore data.json before retrying.");
  }

  return snapshot;
}

export async function readProfileStatsSnapshot(filename: string): Promise<ProfileStatsSnapshot | null> {
  let source: string;

  try {
    source = await readFile(filename, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return null;

    throw error;
  }

  try {
    return parseProfileStatsSnapshot(source);
  } catch (error) {
    throw new Error(
      `Invalid profile stats snapshot at ${filename}; restore it before retrying. History was not reset.`,
      { cause: error },
    );
  }
}

export function summarizeProfileStats(data: ProfileStatsSnapshot) {
  return {
    articles: data.articles.count,
    words: data.articles.words,
    projects: data.projects,
    currentStreak: data.streak.current,
    longestStreak: data.streak.longest,
  };
}

export function formatProfileNumber(value: number) {
  if (value < 1000) return String(value);

  const divisor = value >= 1_000_000 ? 1_000_000 : 1000;

  return `${Number((value / divisor).toFixed(1))} ${divisor === 1000 ? "K" : "M"}`;
}

function isProfileStatsSnapshot(value: unknown): value is ProfileStatsSnapshot {
  return (
    isRecord(value) &&
    isNonNegativeSafeInteger(value.version) &&
    value.version >= 1 &&
    isNonNegativeSafeInteger(value.projects) &&
    isArticleStats(value.articles) &&
    isStreakStats(value.streak)
  );
}

function isArticleStats(value: unknown): value is ProfileStatsSnapshot["articles"] {
  if (
    !isRecord(value) ||
    !isNonNegativeSafeInteger(value.count) ||
    !isNonNegativeSafeInteger(value.words) ||
    !isRecord(value.hashes) ||
    !isRecord(value.wordCounts)
  ) {
    return false;
  }

  const { count, words, hashes, wordCounts } = value;
  const files = Object.keys(hashes);

  if (files.length !== count || Object.keys(wordCounts).length !== count) {
    return false;
  }

  let totalWords = 0;

  for (const file of files) {
    const hash = hashes[file];
    const wordCount = wordCounts[file];

    if (
      !isRelativeMdxPath(file) ||
      typeof hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(hash) ||
      !Object.hasOwn(wordCounts, file) ||
      !isNonNegativeSafeInteger(wordCount)
    ) {
      return false;
    }

    totalWords += wordCount;
  }

  return totalWords === words;
}

function isRelativeMdxPath(filename: string): boolean {
  return (
    filename.endsWith(".mdx") &&
    !filename.includes("\\") &&
    filename.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function isStreakStats(value: unknown): value is ProfileStatsSnapshot["streak"] {
  if (!isRecord(value) || !isNonNegativeSafeInteger(value.longest)) {
    return false;
  }

  if (value.current === null) {
    return value.asOf === null;
  }

  return isNonNegativeSafeInteger(value.current) && isCalendarDate(value.asOf);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
