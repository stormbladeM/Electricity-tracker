"use client";

import Link from "next/link";
import { AdminPageHeader } from "../ui/admin-page-header";
import { TabNav } from "../ui/tab-nav";
import { useAdminAccess } from "../shell/use-admin-access";
import { DiscosPanel } from "./discos-panel";
import { PlacesPanel } from "./places-panel";
import { LOCATION_TABS, LOCATION_TAB_LABEL, type LocationTab } from "./location-tab";

/**
 * The reference data every log and fault is denormalized against.
 *
 * Admin-only, and the sidebar already hides it from moderators — but a
 * moderator who types the URL gets told why rather than a broken screen, since
 * every write here would be refused by the database anyway.
 *
 * This is the one screen in the panel that can damage history rather than
 * describe it: merging an area moves real logs. The destructive path is
 * therefore the narrowest thing here — one control, inside an LGA, only ever
 * between two areas of that same LGA, never the default one.
 */
export function LocationsView({ tab }: { tab: LocationTab }) {
  const { isAdmin } = useAdminAccess();

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <AdminPageHeader
          title="Locations"
          blurb="The reference data every log and fault is filed against."
        />
        <p className="text-14 text-text">
          Editing locations is admin-only. Moderators work the{" "}
          <Link href="/admin/moderation" className="text-primary-text hover:underline">
            moderation queue
          </Link>{" "}
          and{" "}
          <Link href="/admin/faults" className="text-primary-text hover:underline">
            fault triage
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Locations"
        blurb="The reference data every log and fault is filed against. Every edit is audited."
      />

      <TabNav
        label="Location sections"
        tabs={LOCATION_TABS.map((option) => ({
          href: `/admin/locations?tab=${option}`,
          label: LOCATION_TAB_LABEL[option],
          isActive: option === tab,
        }))}
      />

      {tab === "places" ? <PlacesPanel /> : <DiscosPanel />}
    </div>
  );
}
