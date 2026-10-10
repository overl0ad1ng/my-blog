import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value).toISOString());

export const documentDatesSchema = z.object({
  publishedAt: timestampSchema,
  updatedAt: timestampSchema,
});

const snapshotSchema = z.record(z.string(), documentDatesSchema);

export type DocumentDates = z.infer<typeof documentDatesSchema>;
export type DocumentDatesSnapshot = z.infer<typeof snapshotSchema>;

export function getDocumentDatesDataPath(projectRoot = process.cwd()) {
  return path.join(projectRoot, "src/content/document-dates.json");
}

export async function readDocumentDatesSnapshot(filename: string): Promise<DocumentDatesSnapshot> {
  let source: string;
  try {
    source = await readFile(filename, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }

  return snapshotSchema.parse(JSON.parse(source));
}
