import "server-only";

import { run } from "@mdx-js/mdx";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import * as runtime from "react/jsx-runtime";
import { compileDoc, getDocBySlug } from "@/lib/content";
import { DocumentDates } from "./DocumentDates";
import { mdxComponents } from "./mdx/mdx-components";

export async function DocumentPage({ slug = [] }: { slug?: string[] }) {
  if (process.env.NODE_ENV === "development") await connection();
  const doc = await getDocBySlug(slug);
  if (!doc) notFound();
  const code = await compileDoc(doc.source);
  const { default: Content } = await run(code, runtime);
  return (
    <article aria-label={doc.title} className="mx-auto max-w-3xl pb-24 break-words">
      <Content components={mdxComponents} />
      <DocumentDates dates={doc.dates} />
    </article>
  );
}

export function DocumentLoading() {
  return <p role="status" className="flex items-center justify-center h-dvh text-sm text-neutral-500">Loading content…</p>;
}
