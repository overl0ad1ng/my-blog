import { generateDocumentDates } from "./generate-document-dates.mjs";

async function main() {
  const snapshot = await generateDocumentDates();
  console.log(`[document-dates] Generated dates for ${Object.keys(snapshot).length} Blog articles.`);
}

main().catch((error: unknown) => {
  console.error(`[document-dates] ${error instanceof Error ? error.message : "Date generation failed."}`);
  process.exitCode = 1;
});
