import type { Metadata } from "next";
import { CoverageView } from "@/components/admin/coverage/coverage-view";
import { parseAdminWindow } from "@/components/admin/ui/admin-window";

export const metadata: Metadata = {
  title: "Coverage — Admin",
};

export default async function AdminCoveragePage({
  searchParams,
}: PageProps<"/admin/coverage">) {
  const { days } = await searchParams;

  return <CoverageView days={parseAdminWindow(days)} />;
}
