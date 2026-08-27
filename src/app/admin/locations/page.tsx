import type { Metadata } from "next";
import {
  LocationsView,
  parseLocationTab,
} from "@/components/admin/locations/locations-view";

export const metadata: Metadata = {
  title: "Locations — Admin",
};

export default async function AdminLocationsPage({
  searchParams,
}: PageProps<"/admin/locations">) {
  const { tab } = await searchParams;

  return <LocationsView tab={parseLocationTab(tab)} />;
}
