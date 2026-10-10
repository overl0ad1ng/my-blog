import { getContributions, getContributionYears, getRecentContributions } from "@/lib/contributions";
import { isContributionYear } from "@/lib/contribution-calendar";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.size === 0) {
    try {
      return Response.json({ contributions: await getRecentContributions() }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return Response.json({ error: "Contribution data is temporarily unavailable. Please try again." }, { status: 503 });
    }
  }
  const value = params.get("year");
  const year = Number(value);
  if (params.size !== 1 || !value || !/^\d{4}$/.test(value) || !isContributionYear(year, new Date().getUTCFullYear())) {
    return Response.json({ error: "Choose a valid contribution year." }, { status: 400 });
  }
  try {
    const years = await getContributionYears();
    if (!years.includes(year)) return Response.json({ error: "This contribution year is unavailable." }, { status: 400 });
    const contributions = await getContributions(year);
    return Response.json({ years, contributions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Contribution data is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
