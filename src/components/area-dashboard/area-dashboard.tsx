"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import {
  formatCompactDuration,
  formatSpokenDuration,
} from "@/components/personal-dashboard/format-stats";
import { ChartEntry } from "@/components/personal-dashboard/chart-entry";
import { FaultsNearby } from "@/components/faults/faults-nearby";
import { AnomalyBanner } from "@/components/forecast/anomaly-banner";
import { GridEventNote } from "@/components/grid-events/grid-event-note";
import { ForecastPanel } from "@/components/forecast/forecast-panel";
import { StatTile, StatTileSkeleton } from "@/components/personal-dashboard/stat-tile";
import { RibbonLegend } from "@/components/supply-ribbon/ribbon-legend";
import { MeterIcon, TransformerIcon } from "@/components/icons";
import { AREA_PERIOD_PHRASES, type AreaPeriod } from "./area-period";
import { AreaPeriodSelector } from "./area-period-selector";
import { AreaRibbonGrid, AreaRibbonGridSkeleton } from "./area-ribbon-grid";
import { ConfidenceBadge } from "./confidence-badge";
import { hourOfDayRows } from "./hour-of-day";
import { HourOfDayHeatmap, HourOfDayHeatmapSkeleton } from "./hour-of-day-heatmap";
import { LgaComparison } from "./lga-comparison";
import { MeterReadout, MeterReadoutSkeleton } from "./meter-readout";
import { NationalRankingView } from "./national-ranking";
import { buildNationalRanking, rowsForState } from "./ranking";
import { ScopeSelector } from "./scope-selector";
import { useAreaScope } from "./use-area-scope";
import { useAreaStats } from "./use-area-stats";
import { useAreaWindowLogs } from "./use-area-window-logs";
import { useLgaRanking } from "./use-lga-ranking";
import { monthlyAvailabilityRows } from "./year-ribbons";
import type { Scope } from "./scope";

const RIBBON_HEADINGS: Record<AreaPeriod, string> = {
  daily: "Today, hour by hour",
  weekly: "The last 7 days",
  monthly: "The last 30 days",
  yearly: "Average day, month by month",
};

/**
 * The area dashboard (M4): aggregate power supply for the signed-in user's
 * LGA or their whole state, across every contributor — not just their own
 * logs, which is what the personal dashboard shows.
 *
 * It carries the seven-segment uptime readout, the graded confidence badge,
 * the longest-outage / outage-count stats, the ribbon at four scales (the
 * 30-day barcode and the 12-month average grid included), the hour-of-day
 * heatmap, the LGA comparison for the user's state, and the national
 * ranking. The comparison and ranking read the `lga_uptime_ranking` Postgres
 * function so it is one round trip, not one per LGA.
 *
 * M7 adds two forecasting surfaces on top of it: the anomaly banner near the
 * top, where a sharp recent change is the most urgent thing on the screen,
 * and the forecast section at the bottom, after every measured figure it is
 * derived from. A projection should never be the first thing a reader meets.
 */
export function AreaDashboard({ period, scope }: { period: AreaPeriod; scope: Scope }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const resolved = useAreaScope(scope, profile?.state_id, profile?.lga_id);
  const areaIds = resolved.data?.areaIds ?? [];
  const areaStats = useAreaStats(areaIds, period);
  const ribbon = useAreaWindowLogs(areaIds, period);

  // "When is power usually on" is a longer-run question than the period
  // toggle, so the heatmap always reads a fixed 30-day window of its own.
  const heatmap = useAreaWindowLogs(areaIds, "monthly");

  const months = useMemo(
    () =>
      period === "yearly" && ribbon.data
        ? monthlyAvailabilityRows(ribbon.data.days)
        : [],
    [period, ribbon.data],
  );

  const weekdayRows = useMemo(
    () => (heatmap.data ? hourOfDayRows(heatmap.data.days) : []),
    [heatmap.data],
  );

  const ranking = useLgaRanking(period);
  const stateRows = useMemo(
    () => rowsForState(ranking.rows ?? [], profile?.state_id ?? null),
    [ranking.rows, profile?.state_id],
  );
  const nationalRanking = useMemo(
    () => buildNationalRanking(ranking.rows ?? [], profile?.lga_id ?? null),
    [ranking.rows, profile?.lga_id],
  );

  const isAccountLoading = isAuthLoading || isProfileLoading;
  const phrase = AREA_PERIOD_PHRASES[period];

  if (isAccountLoading) {
    return (
      <DashboardShell>
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-10 w-full animate-pulse rounded bg-surface" />
        </div>
      </DashboardShell>
    );
  }

  if (!profile?.area_id || !profile.lga_id || !profile.state_id) {
    return (
      <DashboardShell>
        <p className="text-16 text-text">Set your area to see the local dashboard.</p>
        <Link
          href="/onboarding"
          className="self-start rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Choose your area
        </Link>
      </DashboardShell>
    );
  }

  const scopeName = resolved.data?.name ?? "your area";
  const error = resolved.error ?? areaStats.error;
  const isLoading = resolved.isLoading || areaStats.isLoading;
  const stats = areaStats.data?.stats ?? null;
  const coverage = areaStats.data?.coverage ?? null;
  const knowsNothing = coverage !== null && !coverage.hasAnyKnowledge;

  return (
    <DashboardShell>
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 rounded text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Home
        </Link>
        <h1 className="font-display text-32 font-medium text-text">{scopeName}</h1>
        <p className="text-14 text-text-muted">
          Power supply {phrase}, across every contributor.
        </p>
        {resolved.data?.disco && (
          <p className="flex items-center gap-1.5 text-14 text-text-muted">
            <TransformerIcon size={16} className="shrink-0 text-text-muted" />
            {resolved.data.disco.name}
            {resolved.data.disco.shortName ? ` (${resolved.data.disco.shortName})` : ""}
          </p>
        )}
        {resolved.data?.stateSlug && resolved.data?.lgaSlug && (
          <Link
            href={`/state/${resolved.data.stateSlug}/lga/${resolved.data.lgaSlug}`}
            className="w-fit rounded text-14 text-primary-text underline underline-offset-4"
          >
            Public page for {resolved.data.lgaName}
          </Link>
        )}
      </header>

      {resolved.data && (
        <ScopeSelector
          scope={scope}
          period={period}
          lgaName={resolved.data.lgaName}
          stateName={resolved.data.stateName}
        />
      )}

      <AreaPeriodSelector period={period} scope={scope} />

      <section className="flex flex-col gap-3">
        <h2 className="sr-only">Uptime</h2>

        {error ? (
          <p className="text-14 text-fault">{error}</p>
        ) : isLoading || !coverage ? (
          <HeroSkeleton />
        ) : knowsNothing ? (
          <EmptyScope scopeName={scopeName} />
        ) : (
          <div className="flex flex-col gap-4 rounded border border-hairline bg-surface p-4">
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-12 text-text-muted">
                <MeterIcon size={14} className="shrink-0" />
                Uptime {phrase}
              </p>
              <MeterReadout percent={stats ? stats.uptimePercent : null} />
              {resolved.data?.kind === "state" && coverage.areaCount > 0 && (
                <p className="text-12 text-text-muted">
                  Average across {coverage.areaCount}{" "}
                  {coverage.areaCount === 1 ? "area" : "areas"} in {resolved.data.stateName}.
                </p>
              )}
            </div>

            <ConfidenceBadge coverage={coverage} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="sr-only">Outages {phrase}</h2>

        {error ? null : isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <StatTileSkeleton />
            <StatTileSkeleton />
          </div>
        ) : knowsNothing ? null : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Longest outage"
              value={
                stats && stats.longestMinutes !== null
                  ? formatCompactDuration(stats.longestMinutes)
                  : "—"
              }
              spoken={
                stats && stats.longestMinutes !== null
                  ? formatSpokenDuration(stats.longestMinutes)
                  : undefined
              }
              hint={
                stats && stats.longestMinutes !== null
                  ? stats.longestIsOngoing
                    ? "Still off."
                    : undefined
                  : "None logged."
              }
            />
            <StatTile label="Outages" value={stats ? String(stats.outageCount) : "0"} />
          </div>
        )}
      </section>

      <GridEventNote areaIds={areaIds} areaName={scopeName} />

      <AnomalyBanner lgaId={profile.lga_id} areaName={scopeName} />

      <FaultsNearby lgaId={profile.lga_id} heading="Open faults here" />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">
          {RIBBON_HEADINGS[period]}
        </h2>

        <div className="rounded border border-hairline bg-surface p-4">
          {error || ribbon.error ? (
            <p className="text-14 text-fault">{error ?? ribbon.error}</p>
          ) : ribbon.isLoading || !ribbon.data ? (
            <AreaRibbonGridSkeleton period={period} />
          ) : (
            <>
              {ribbon.data.coverage.hasAnyKnowledge ? (
                <ChartEntry key={period}>
                  <AreaRibbonGrid
                    period={period}
                    days={ribbon.data.days}
                    months={months}
                    areaName={scopeName}
                  />
                </ChartEntry>
              ) : (
                <p className="text-14 text-text-muted">No logs in this window yet.</p>
              )}

              <div className="mt-4 border-t border-hairline pt-4">
                <RibbonLegend compact />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">
          When power is usually on
        </h2>
        <p className="text-14 text-text-muted">
          Each weekday, averaged hour by hour over the last 30 days.
        </p>

        <div className="rounded border border-hairline bg-surface p-4">
          {error || heatmap.error ? (
            <p className="text-14 text-fault">{error ?? heatmap.error}</p>
          ) : heatmap.isLoading || !heatmap.data ? (
            <HourOfDayHeatmapSkeleton />
          ) : heatmap.data.coverage.hasAnyKnowledge ? (
            <ChartEntry>
              <HourOfDayHeatmap rows={weekdayRows} areaName={scopeName} />
            </ChartEntry>
          ) : (
            <p className="text-14 text-text-muted">
              Not enough logs yet to show a weekly pattern.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">
          {resolved.data ? `How ${resolved.data.stateName} compares` : "How your state compares"}
        </h2>
        <p className="text-14 text-text-muted">
          Uptime by LGA {phrase}, most reliable first.
        </p>

        <div className="rounded border border-hairline bg-surface p-4">
          {ranking.error ? (
            <p className="text-14 text-fault">{ranking.error}</p>
          ) : ranking.isLoading || !ranking.rows ? (
            <RankingSkeleton />
          ) : (
            <ChartEntry key={period}>
              <LgaComparison
                rows={stateRows}
                myLgaId={profile.lga_id}
                stateName={resolved.data?.stateName ?? "your state"}
              />
            </ChartEntry>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">National ranking</h2>
        <p className="text-14 text-text-muted">
          Best and least-served LGAs {phrase}, among those with enough reports to rank.
        </p>

        <div className="rounded border border-hairline bg-surface p-4">
          {ranking.error ? (
            <p className="text-14 text-fault">{ranking.error}</p>
          ) : ranking.isLoading || !ranking.rows ? (
            <RankingSkeleton rows={6} />
          ) : (
            <ChartEntry key={period}>
              <NationalRankingView ranking={nationalRanking} myLgaId={profile.lga_id} />
            </ChartEntry>
          )}
        </div>
      </section>

      <ForecastPanel areaIds={areaIds} areaName={scopeName} />

      <p className="text-12 text-text-muted">
        Outage history rebuilds a few minutes after each log.
      </p>
    </DashboardShell>
  );
}

/** Page frame: single column, mobile-first, wide enough for the month grid. */
function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">{children}</div>
    </main>
  );
}

function HeroSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded border border-hairline bg-surface p-4"
      aria-busy="true"
    >
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-hairline" />
        <MeterReadoutSkeleton />
      </div>
      <div className="h-3 w-40 animate-pulse rounded bg-hairline" />
    </div>
  );
}

function RankingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="h-3 w-32 animate-pulse rounded bg-hairline" />
          <div className="h-2 w-full animate-pulse rounded-full bg-hairline" />
        </div>
      ))}
    </div>
  );
}

function EmptyScope({ scopeName }: { scopeName: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
      <p className="text-16 text-text">
        No logs yet in {scopeName}. Be the first to report.
      </p>
      <Link href="/" className="rounded text-14 text-primary-text underline underline-offset-4">
        Log power on the home screen
      </Link>
    </div>
  );
}
