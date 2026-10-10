import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createProcessor } from "@mdx-js/mdx";
import { ASIDE_CONFIG, type AsideConfig } from "../src/lib/config";
import { getGitHubConfig, type GitHubContributionConfig } from "../src/lib/github-client";
import { fetchCurrentStreak } from "../src/lib/profile-streak";
import { getProfileStatsDataPath, readProfileStatsSnapshot, WORD_COUNT_VERSION, type ProfileStatsSnapshot } from "../src/lib/profile-stats-data";

type TextNode = { type: string; value?: string; children?: TextNode[] };
const parser = createProcessor({ format: "mdx" });
const ignored = new Set(["code", "inlineCode", "mdxjsEsm", "mdxFlowExpression", "mdxTextExpression", "html"]);
const inline = new Set(["text", "emphasis", "strong", "delete", "link", "linkReference", "mdxJsxTextElement"]);

export function countMdxWords(source: string) {
  function text(node: TextNode): string {
    if (ignored.has(node.type)) return " ";
    if (node.type === "text") return node.value ?? "";
    const body = (node.children ?? []).map(text).join("");
    return inline.has(node.type) ? body : `\n${body}\n`;
  }
  // Parse only: imports, expressions and components are never executed.
  const body = text(parser.parse(source));
  return body.match(/\p{Script=Han}|[a-zA-Z]+(?:['’\-][a-zA-Z]+)*/gu)?.length ?? 0;
}

export function countProjects(config: AsideConfig[]) {
  return config.find((group) => group.slug === "projects")?.children?.filter((child) => !!child.slug?.trim()).length ?? 0;
}

async function listMdx(root: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listMdx(root, relative));
    else if (entry.isFile() && entry.name.endsWith(".mdx")) files.push(relative);
  }
  return files.sort();
}

async function acquireLock(filename: string, timeoutMs: number) {
  const started = Date.now();
  while (true) {
    try {
      return await open(filename, "wx");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      if (Date.now() - started >= timeoutMs) {
        throw new Error(`Profile stats lock is busy: ${filename}. Retry after the other run finishes; remove a stale lock only after confirming no stats script is running.`);
      }
      await delay(100);
    }
  }
}

export interface GenerateStatsOptions {
  contentRoot?: string;
  dataPath?: string;
  config?: AsideConfig[];
  github?: GitHubContributionConfig | null;
  now?: Date;
  fetcher?: typeof fetch;
  wordCountVersion?: number;
  countWords?: (source: string) => number;
  warn?: (message: string) => void;
  lockTimeoutMs?: number;
}

export async function generateProfileStats(options: GenerateStatsOptions = {}) {
  const contentRoot = options.contentRoot ?? path.resolve("src/content");
  const dataPath = options.dataPath ?? getProfileStatsDataPath();
  const version = options.wordCountVersion ?? WORD_COUNT_VERSION;
  const lockPath = `${dataPath}.lock`;
  await mkdir(path.dirname(dataPath), { recursive: true });
  const lock = await acquireLock(lockPath, options.lockTimeoutMs ?? 120_000);
  const tempPath = `${dataPath}.${randomUUID()}.tmp`;
  try {
    const previous = await readProfileStatsSnapshot(dataPath);
    const hashes: Record<string, string> = {};
    const wordCounts: Record<string, number> = {};
    let parsed = 0;
    for (const relative of await listMdx(contentRoot)) {
      const source = await readFile(path.join(contentRoot, relative));
      const hash = createHash("sha256").update(source).digest("hex");
      hashes[relative] = hash;
      if (previous?.version === version && previous.articles.hashes[relative] === hash) {
        wordCounts[relative] = previous.articles.wordCounts[relative];
      } else {
        try {
          wordCounts[relative] = (options.countWords ?? countMdxWords)(source.toString("utf8"));
          parsed++;
        } catch (error) {
          throw new Error(`Could not count MDX words in ${relative}. Snapshot was not changed.`, { cause: error });
        }
      }
    }
    const streak = { ...previous?.streak ?? { current: null, longest: 9, asOf: null } };
    const github = options.github === undefined ? getGitHubConfig() : options.github;
    const warn = options.warn ?? console.warn;
    if (github) {
      try {
        const today = (options.now ?? new Date()).toISOString().slice(0, 10);
        const current = await fetchCurrentStreak(github, today, options.fetcher);
        streak.current = current;
        streak.longest = Math.max(streak.longest, current);
        streak.asOf = today;
      } catch {
        warn("[stats] GitHub unavailable; keeping the previous streak snapshot.");
      }
    } else {
      warn("[stats] GitHub is not configured; keeping the previous streak snapshot.");
    }
    const snapshot: ProfileStatsSnapshot = {
      version,
      articles: { count: Object.keys(hashes).length, hashes, wordCounts, words: Object.values(wordCounts).reduce((sum, count) => sum + count, 0) },
      projects: countProjects(options.config ?? ASIDE_CONFIG),
      streak,
    };
    const temp = await open(tempPath, "wx");
    try {
      await temp.writeFile(`${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await temp.sync();
    } finally {
      await temp.close();
    }
    await rename(tempPath, dataPath);
    return { snapshot, parsed, reused: snapshot.articles.count - parsed };
  } finally {
    try {
      await unlink(tempPath).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}
