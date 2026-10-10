import nextEnv from "@next/env";

async function main() {
  const development = process.argv.includes("--development");
  const production = process.argv.includes("--production") || !development && process.env.NODE_ENV === "production";
  Object.assign(process.env, { NODE_ENV: production ? "production" : development ? "development" : process.env.NODE_ENV === "test" ? "test" : "development" });
  nextEnv.loadEnvConfig(process.cwd(), !production);
  const { generateProfileStats } = await import("./profile-stats.mjs");
  const { snapshot, parsed, reused } = await generateProfileStats();
  console.log(`[stats] ${snapshot.articles.count} articles, ${snapshot.articles.words} words, ${snapshot.projects} projects (${parsed} parsed, ${reused} reused).`);
}

main().catch((error: unknown) => {
  console.error(`[stats] ${error instanceof Error ? error.message : "Local statistics failed."}`);
  process.exitCode = 1;
});
