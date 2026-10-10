import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getHref, isValidSegment, resolveAsideConfig } from "./lib/navigation";

const { docs } = resolveAsideConfig();

async function isFile(filename: string) {
  try {
    return (await stat(filename)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR")) return false;
    throw error;
  }
}

// Reject missing/private pages before a Suspense boundary starts streaming,
// so direct requests receive an HTTP 404 as well as Next's not-found UI.
export async function proxy(request: NextRequest) {
  const notFound = () => NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  let segments: string[];
  try {
    segments = request.nextUrl.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return notFound();
  }
  if (!segments.every(isValidSegment)) return notFound();

  const entry = docs.find((doc) => getHref(doc.segments) === getHref(segments));
  if (entry) {
    return await isFile(path.join(process.cwd(), "src/content", entry.file)) ? NextResponse.next() : notFound();
  }
  if (await isFile(path.join(process.cwd(), "public", ...segments))) return NextResponse.next();
  return notFound();
}

export const config = {
  matcher: ["/((?!_next/|api/contributions$|favicon\\.ico$).*)"],
};
