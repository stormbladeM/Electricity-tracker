"use client";

import type { ReactNode } from "react";
import { formatCompactDuration } from "@/components/personal-dashboard/format-stats";
import { AdminPageHeader } from "../ui/admin-page-header";
import { MetricTile, MetricTileSkeleton } from "../ui/metric-tile";
import { WindowSelector } from "../ui/window-selector";
import { adminWindowPhrase, type AdminWindow } from "../ui/admin-window";
import { GrowthChart, GrowthChartSkeleton } from "./growth-chart";
import { formatCount, formatDelta, formatPercent } from "./overview-format";
import { useAdminOverview, type AdminOverviewData } from "./use-admin-overview";

/**
 * The admin panel's front page: is the platform healthy, is it growing, and
 * what is waiting to be done.
 *
 * Three bands, in the order an admin actually reads them — the backlog first,
 * because it is the only part that asks something of the person looking; then
 * the platform's size and reliability; then growth over the window. Everything
 * is scoped by the window in the URL except the backlogs, which are always
 * "right now" (see migration 0007).
 */
export function AdminOverview({ days }: { days: AdminWindow }) {
  const { data, isLoading, error, refetch } = useAdminOverview(days);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Overview"
        blurb={`Platform health and growth over ${adminWindowPhrase(days)}.`}
      >
        <WindowSelector days={days} />
      </AdminPageHeader>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
          <p className="text-14 text-fault">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded border border-hairline px-3 py-2 text-14 text-text hover:border-text-muted"
          >
            Try again
          </button>
        </div>
      ) : isLoading || !data ? (
        <OverviewSkeleton />
      ) : (
        <OverviewBands data={data} days={days} />
      )}
    </div>
  );
}

function OverviewBands({ data, days }: { data: AdminOverviewData; days: AdminWindow }) {
  const { stats, series } = data;

  return (
    <>
      <Band title="Waiting on you">
        <MetricTile
          label="Flagged logs"
          value={formatCount(stats.flagged_logs_open)}
          tone={stats.flagged_logs_open > 0 ? "warn" : "default"}
          hint={
            stats.flagged_logs_open > 0
              ? "Held out of every public figure until reviewed."
              : "Nothing held back from the public figures."
          }
        />
        <MetricTile
          label="Untriaged faults"
          value={formatCount(stats.faults_untriaged)}
          tone={stats.faults_untriaged > 0 ? "fault" : "default"}
          hint="Reported, not yet acknowledged."
        />
        <MetricTile
          label="Open faults"
          value={formatCount(stats.faults_open)}
          hint={`${formatCount(stats.faults_window)} reported in ${adminWindowPhrase(days)}.`}
        />
        <MetricTile
          label="Median time to resolve"
          value={
            stats.median_resolution_hours == null
              ? "—"
              : formatCompactDuration(stats.median_resolution_hours * 60)
          }
          hint={
            stats.faults_resolved_window > 0
              ? `Across ${formatCount(stats.faults_resolved_window)} resolved in ${adminWindowPhrase(days)}.`
              : `Nothing resolved in ${adminWindowPhrase(days)}.`
          }
        />
      </Band>

      <Band title="Platform">
        <MetricTile
          label="Logs"
          value={formatCount(stats.logs_window)}
          delta={formatDelta(stats.logs_window, stats.logs_prev_window, days)}
          hint={`${formatCount(stats.logs_total)} all time.`}
        />
        <MetricTile
          label="Active contributors"
          value={formatCount(stats.contributors_window)}
          hint={`${formatCount(stats.contributors_total)} have ever logged.`}
        />
        <MetricTile
          label="New accounts"
          value={formatCount(stats.new_users_window)}
          hint={`${formatCount(stats.users_total)} in total, ${formatCount(stats.banned_users)} banned.`}
        />
        <MetricTile
          label="National uptime"
          value={formatPercent(stats.national_uptime_percent)}
          unit="%"
          hint={`Across ${formatCount(stats.lgas_tracked)} of ${formatCount(stats.lgas_total)} LGAs with data.`}
        />
      </Band>

      <Band title="Growth" columns={3}>
        <GrowthChart
          label="Logs per day"
          noun="logs"
          tone="series-1"
          points={series.map((point) => ({ day: point.day, value: point.logs }))}
        />
        <GrowthChart
          label="New accounts per day"
          noun="accounts"
          tone="series-2"
          points={series.map((point) => ({ day: point.day, value: point.new_users }))}
        />
        <GrowthChart
          label="Faults reported per day"
          noun="faults"
          tone="fault"
          points={series.map((point) => ({ day: point.day, value: point.faults }))}
        />
      </Band>

      <p className="text-12 text-text-muted">
        {stats.audit_actions_window === 0
          ? `No admin actions recorded in ${adminWindowPhrase(days)}.`
          : `${formatCount(stats.audit_actions_window)} admin actions recorded in ${adminWindowPhrase(days)}.`}
      </p>
    </>
  );
}

/** A titled row of tiles or charts — full width on desktop, two up on a phone. */
function Band({
  title,
  columns = 4,
  children,
}: {
  title: string;
  columns?: 3 | 4;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-12 font-medium uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      <div
        className={`grid grid-cols-2 gap-3 ${
          columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {[0, 1].map((band) => (
        <div key={band} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <MetricTileSkeleton key={index} />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 3 }, (_, index) => (
          <GrowthChartSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
