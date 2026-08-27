import type { Metadata } from "next";
import { AreaDashboard } from "@/components/area-dashboard/area-dashboard";
import { parseAreaPeriod } from "@/components/area-dashboard/area-period";
import { parseScope } from "@/components/area-dashboard/scope";

export const metadata: Metadata = {
  title: "Area dashboard — Nigeria Electricity Tracker",
  description: "Aggregate power uptime for your LGA and state, across every contributor.",
};

/**
 * Scope and period are read from the URL and passed down, so
 * /area?scope=state&period=yearly is a link somebody can send, bookmark or
 * reload into. Unrecognised values fall back to the defaults rather than
 * erroring.
 */
export default async function AreaPage({ searchParams }: PageProps<"/area">) {
  const { scope, period } = await searchParams;

  return <AreaDashboard scope={parseScope(scope)} period={parseAreaPeriod(period)} />;
}
