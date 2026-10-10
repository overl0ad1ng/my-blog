import { formatBeijingDate } from "@/lib/date-utils";
import type { DocumentDates as DocumentDateMetadata } from "@/lib/document-dates";

export function DocumentDates({ dates }: { dates: DocumentDateMetadata | undefined }) {
  if (!dates) return null;

  return (
    <footer className="mt-12 flex flex-col items-start gap-x-2 gap-y-1 border-t border-neutral-700 pt-4 text-xs text-neutral-400 sm:flex-row sm:flex-wrap sm:items-center">
      <span>Published At: <time dateTime={dates.publishedAt} className="whitespace-nowrap">{formatBeijingDate(new Date(dates.publishedAt))}</time></span>
      <span aria-hidden="true" className="hidden sm:inline">·</span>
      <span>Updated At: <time dateTime={dates.updatedAt} className="whitespace-nowrap">{formatBeijingDate(new Date(dates.updatedAt))}</time></span>
    </footer>
  );
}
