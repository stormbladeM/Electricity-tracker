import type { Metadata } from "next";
import { PersonalDashboard } from "@/components/personal-dashboard/personal-dashboard";
import { parsePeriod } from "@/components/personal-dashboard/period";

export const metadata: Metadata = {
  title: "Your dashboard — Nigeria Electricity Tracker",
  description: "Uptime, longest outage and outage count for your area.",
};

/**
 * The selected period is read here, from the URL, and passed down — so
 * /dashboard?period=monthly is a link somebody can send, bookmark or reload
 * into, and the back button steps through the periods they looked at. An
 * unrecognised value falls back to the default rather than erroring.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { period } = await searchParams;

  return <PersonalDashboard period={parsePeriod(period)} />;
}
