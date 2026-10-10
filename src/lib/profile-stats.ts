import "server-only";

import { getProfileStatsDataPath, readProfileStatsSnapshot, summarizeProfileStats } from "./profile-stats-data";

export async function getProfileStats() {
  return process.env.NODE_ENV === "development" ? readSummary() : getCachedSummary();
}

async function readSummary() {
  const snapshot = await readProfileStatsSnapshot(getProfileStatsDataPath());

  if (!snapshot) throw new Error("Profile stats snapshot is missing; run pnpm stats before starting Next.js.");

  return summarizeProfileStats(snapshot);
}

async function getCachedSummary() {
  "use cache";
  return readSummary();
}
