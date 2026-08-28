"use client";

import { AdminPageHeader } from "../ui/admin-page-header";
import { TabNav } from "../ui/tab-nav";
import { WindowSelector } from "../ui/window-selector";
import type { AdminWindow } from "../ui/admin-window";
import { FaultMetricsPanel } from "./fault-metrics-panel";
import { TriageTable } from "./triage-table";
import {
  TRIAGE_TABS,
  TRIAGE_TAB_BLURB,
  TRIAGE_TAB_LABEL,
  TRIAGE_TAB_STATUSES,
  triageHref,
  type TriageTab,
} from "./triage-tab";

const EMPTY_MESSAGE: Record<Exclude<TriageTab, "metrics">, string> = {
  untriaged: "Nothing is waiting for triage.",
  open: "Nothing is being worked on right now.",
  closed: "No faults have been closed yet.",
};

/**
 * Fault triage: the queue in three lifecycle groups, and the resolution
 * metrics beside them.
 *
 * The window selector only applies to metrics — a queue is not a window, it is
 * everything currently in that state — so it is only rendered on that tab
 * rather than sitting there greyed out on the others.
 */
export function TriageView({ tab, days }: { tab: TriageTab; days: AdminWindow }) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Faults" blurb={TRIAGE_TAB_BLURB[tab]}>
        {tab === "metrics" && <WindowSelector days={days} />}
      </AdminPageHeader>

      <TabNav
        label="Fault triage sections"
        tabs={TRIAGE_TABS.map((option) => ({
          href: triageHref(option),
          label: TRIAGE_TAB_LABEL[option],
          isActive: option === tab,
        }))}
      />

      {tab === "metrics" ? (
        <FaultMetricsPanel days={days} />
      ) : (
        <TriageTable
          statuses={TRIAGE_TAB_STATUSES[tab]}
          emptyMessage={EMPTY_MESSAGE[tab]}
        />
      )}
    </div>
  );
}
