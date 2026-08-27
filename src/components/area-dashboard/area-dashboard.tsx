"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import {
  formatCompactDuration,
  formatSpokenDuration,
  formatUptime,
} from "@/components/personal-dashboard/format-stats";
import { StatTile, StatTileSkeleton } from "@/components/personal-dashboard/stat-tile";
import { AREA_PERIOD_PHRASES, type AreaPeriod } from "./area-period";
import { AreaPeriodSelector } from "./area-period-selector";
import { ConfidenceBadge } from "./confidence-badge";
import { MeterReadout, MeterReadoutSkeleton } from "./meter-readout";
import { ScopeSelector } from "./scope-selector";
import { useAreaScope } from "./use-area-scope";
import { useAreaStats } from "./use-area-stats";
import type { Scope } from "./scope";

/**
 * The area dashboard (M4): aggregate power supply for the signed-in user's
 * LGA or their whole state, across every contributor — not just their own
 * logs, which is what the personal dashboard shows.
 *
 * This first pass is the shell: the seven-segment uptime readout, the graded
 * confidence badge, and the longest-outage / outage-count stats, at four
 * windows and two scopes. The month ribbon grid, the hour-of-day heatmap and
 * the LGA comparison land in the following passes.
 */
export function AreaDashboard({ period, scope }: { period: AreaPeriod; scope: Scope }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const resolved = useAreaScope(scope, profile?.state_id, profile?.lga_id);
  const areaStats = useAreaStats(resolved.data?.areaIds ?? [], period);

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
              <p className="text-12 text-text-muted">Uptime {phrase}</p>
              <MeterReadout percent={stats ? stats.uptimePercent : null} />
              <p className="sr-only">
                {stats ? `${formatUptime(stats.uptimePercent)} percent` : "not available"}
              </p>
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
