import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/overview/admin-overview";
import { parseAdminWindow } from "@/components/admin/ui/admin-window";

export const metadata: Metadata = {
  title: "Overview — Admin",
};

/**
 * The reporting window comes from `?days=`, so a link to the overview carries
 * the window it was read at. Anything unrecognised falls back to 30 days.
 */
export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const { days } = await searchParams;

  return <AdminOverview days={parseAdminWindow(days)} />;
}
