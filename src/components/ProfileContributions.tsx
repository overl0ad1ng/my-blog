import { getInitialContributions } from "@/lib/contributions";
import { connection } from "next/server";
import ContributionCalendar from "./ContributionCalendar";

export default async function ProfileContributions() {
  // Calculate the rolling dates at request time, never at build time.
  await connection();

  return <ContributionCalendar initial={await getInitialContributions()} />;
}
