import type { Metadata } from "next";
import { AuditView } from "@/components/admin/audit/audit-view";
import { parseAuditFilter } from "@/components/admin/audit/audit-actions";
import { parseAdminWindow } from "@/components/admin/ui/admin-window";

export const metadata: Metadata = {
  title: "Audit log — Admin",
};

export default async function AdminAuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  const { days, filter } = await searchParams;

  return <AuditView days={parseAdminWindow(days)} filter={parseAuditFilter(filter)} />;
}
