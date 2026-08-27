"use client";

import { useAuth } from "@/lib/auth/use-auth";
import { AdminPageHeader } from "../ui/admin-page-header";
import { TabNav } from "../ui/tab-nav";
import { useAdminAccess } from "../shell/use-admin-access";
import { ContributorTable } from "./contributor-table";
import { FlaggedLogQueue } from "./flagged-log-queue";
import {
  MODERATION_TABS,
  MODERATION_TAB_LABEL,
  moderationHref,
  type ModerationTab,
} from "./moderation-tab";

/**
 * Moderation and data quality: the flagged-log queue, and the accounts behind
 * the flags.
 *
 * The two are one job — a cluster of suspect logs is usually one contributor —
 * so they are tabs of a single screen rather than two sidebar entries.
 */
export function ModerationView({
  tab,
  flaggedOnly,
}: {
  tab: ModerationTab;
  flaggedOnly: boolean;
}) {
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Moderation"
        blurb="Logs the detector flagged, and the contributors behind them."
      />

      <TabNav
        label="Moderation sections"
        tabs={MODERATION_TABS.map((option) => ({
          href: moderationHref(option, option === "contributors" && flaggedOnly),
          label: MODERATION_TAB_LABEL[option],
          isActive: option === tab,
        }))}
      />

      {tab === "logs" ? (
        <FlaggedLogQueue />
      ) : (
        <ContributorTable
          flaggedOnly={flaggedOnly}
          isAdmin={isAdmin}
          currentUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}
