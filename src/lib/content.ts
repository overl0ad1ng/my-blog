import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getHref, isValidSegment, resolveAsideConfig } from "./navigation";
import { remarkJoinCjkLines } from "./remark-join-cjk-lines";

const contentRoot = path.join(process.cwd(), "src/content");
const { docs } = resolveAsideConfig();

export async function getDocBySlug(slug: string[]) {
  return process.env.NODE_ENV === "development"
    ? readDocBySlug(slug)
    : getCachedDocBySlug(slug);
}

async function getCachedDocBySlug(slug: string[]) {
  "use cache";
  return readDocBySlug(slug);
}

async function readDocBySlug(slug: string[]) {
  if (!slug.every(isValidSegment)) return null;
  const href = getHref(slug);
  const entry = docs.find((doc) => getHref(doc.segments) === href);
  if (!entry) return null;
  const filename = path.resolve(contentRoot, entry.file);
  const relative = path.relative(contentRoot, filename);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  try {
    const source = await readFile(filename, "utf8");
    return { ...entry, source };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR")) return null;
    throw error;
  }
}

export async function compileDoc(source: string) {
  "use cache";
  const [{ compile }, { default: rehypeShiki }] = await Promise.all([
    import("@mdx-js/mdx"),
    import("@shikijs/rehype"),
  ]);
  return String(await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkJoinCjkLines],
    rehypePlugins: [[rehypeShiki, {
      theme: "github-dark-default",
      langs: [],
      lazy: true,
      addLanguageClass: true,
      stripEndNewline: false,
      defaultLanguage: "text",
      fallbackLanguage: "text",
    }]],
  }));
}
