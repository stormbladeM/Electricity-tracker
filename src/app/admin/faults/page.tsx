import type { Metadata } from "next";
import { TriageView } from "@/components/admin/triage/triage-view";
import { parseTriageTab } from "@/components/admin/triage/triage-tab";
import { parseAdminWindow } from "@/components/admin/ui/admin-window";

export const metadata: Metadata = {
  title: "Faults — Admin",
};

/**
 * `?tab=` picks the lifecycle group; `?days=` only means anything on the
 * metrics tab, where it is the resolution window.
 */
export default async function AdminFaultsPage({
  searchParams,
}: PageProps<"/admin/faults">) {
  const { tab, days } = await searchParams;

  return <TriageView tab={parseTriageTab(tab)} days={parseAdminWindow(days)} />;
}
