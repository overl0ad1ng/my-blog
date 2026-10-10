import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { ASIDE_CONFIG, type AsideConfig } from "../src/lib/config";
import { documentDatesSchema, getDocumentDatesDataPath, type DocumentDatesSnapshot } from "../src/lib/document-dates";
import { resolveAsideConfig } from "../src/lib/navigation";

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

interface GenerateDocumentDatesOptions {
  projectRoot?: string;
  config?: AsideConfig[];
  warn?: (message: string) => void;
}

export async function generateDocumentDates(options: GenerateDocumentDatesOptions = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = options.config ?? ASIDE_CONFIG;
  const warn = options.warn ?? console.warn;
  const snapshot = await collectDocumentDates(projectRoot, config, warn);
  await writeSnapshot(getDocumentDatesDataPath(projectRoot), snapshot);
  return snapshot;
}

async function collectDocumentDates(projectRoot: string, config: AsideConfig[], warn: (message: string) => void) {
  const docs = resolveAsideConfig(config).docs.filter((doc) => doc.segments[0] === "blog");
  const snapshot: DocumentDatesSnapshot = {};
  if (docs.length === 0 || !await hasCompleteGitHistory(projectRoot, warn)) return snapshot;

  // Bound the number of Git processes; each article needs its own rename history.
  for (const doc of docs) {
    const dates = await readGitDates(projectRoot, doc.file, warn);
    if (dates) snapshot[doc.file] = dates;
  }
  return snapshot;
}

async function hasCompleteGitHistory(projectRoot: string, warn: (message: string) => void) {
  try {
    const shallow = await git(projectRoot, ["rev-parse", "--is-shallow-repository"]);
    if (shallow.trim() === "false") return true;
    warn("[document-dates] Shallow Git history; dates hidden. Fetch full history before building to enable dates.");
  } catch {
    warn("[document-dates] Git or repository history unavailable; dates hidden.");
  }
  return false;
}

async function readGitDates(projectRoot: string, file: string, warn: (message: string) => void) {
  try {
    const history = await git(projectRoot, ["log", "--follow", "--topo-order", "--format=%cI", "--", `src/content/${file}`]);
    const timestamps = history.trim().split(/\r?\n/).filter(Boolean);
    if (timestamps.length === 0) {
      warn(`[document-dates] No Git history for ${file}; dates hidden.`);
      return null;
    }
    return documentDatesSchema.parse({ publishedAt: timestamps.at(-1), updatedAt: timestamps[0] });
  } catch {
    warn(`[document-dates] Cannot read Git dates for ${file}; dates hidden.`);
    return null;
  }
}

async function git(projectRoot: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1", GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout;
}

async function writeSnapshot(filename: string, snapshot: DocumentDatesSnapshot) {
  const temporaryPath = `${filename}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(filename), { recursive: true });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filename);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
