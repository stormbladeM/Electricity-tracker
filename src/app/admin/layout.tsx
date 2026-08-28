import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/admin-shell";

/**
 * Everything under /admin renders inside the shell, so the access check and
 * the nav are declared once for the whole section.
 *
 * `robots: noindex` covers the panel wholesale. The public area pages are
 * built to be crawled; this is the opposite of that.
 */
export const metadata: Metadata = {
  title: "Admin — Nigeria Electricity Tracker",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
