"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import { useLga } from "@/lib/hooks/use-lga";
import { RibbonLegend } from "@/components/supply-ribbon/ribbon-legend";
import { ChartEntry } from "./chart-entry";
import { DashboardRibbons, DashboardRibbonsSkeleton } from "./dashboard-ribbons";
import { PeriodSelector } from "./period-selector";
import { StatsPanel } from "./stats-panel";
import { useOutageStats } from "./use-outage-stats";
import { useWindowLogs } from "./use-window-logs";
import type { Period } from "./period";

/**
 * The personal dashboard (M3): the signed-in user's own area, at three scales.
 *
 * Uptime, longest outage and outage count come from the derived
 * `outage_intervals` table; the ribbons come from the raw logs behind it. The
 * numbers and the picture therefore answer to the same evidence — a hatched
 * stretch of ribbon is exactly the coverage the confidence note is warning
 * about.
 *
 * The area-wide aggregate view, the hour-of-day heatmap and the LGA comparison
 * are M4; this screen stays scoped to one area and one person's view of it.
 */
const RIBBON_HEADINGS: Record<Period, string> = {
  daily: "Today, hour by hour",
  weekly: "The last 7 days",
  monthly: "The last 30 days",
};

export function PersonalDashboard({ period }: { period: Period }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { lga } = useLga(profile?.lga_id);

  const areaId = profile?.area_id;
  const stats = useOutageStats(areaId, period);
  const logs = useWindowLogs(areaId, period);

  const areaName = lga?.name ?? "your area";
  const isAccountLoading = isAuthLoading || isProfileLoading;

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

  if (!profile?.area_id) {
    return (
      <DashboardShell>
        <p className="text-16 text-text">Set your area to see your power history.</p>
        <Link
          href="/onboarding"
          className="self-start rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Choose your area
        </Link>
      </DashboardShell>
    );
  }

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
        <h1 className="font-display text-32 font-medium text-text">{areaName}</h1>
        <p className="text-14 text-text-muted">Your power history for this area.</p>
        <Link
          href="/area"
          className="w-fit rounded text-14 text-primary-text underline underline-offset-4"
        >
          See {areaName} across all contributors
        </Link>
      </header>

      <PeriodSelector period={period} />

      <section className="flex flex-col gap-3">
        <h2 className="sr-only">Summary</h2>
        <StatsPanel
          stats={stats.stats}
          coverage={logs.data?.coverage ?? null}
          period={period}
          areaName={areaName}
          isLoading={stats.isLoading || logs.isLoading}
          // Either failure leaves the panel unable to report: without the
          // coverage from the logs query it can't tell an empty window from a
          // perfect one, so it says so rather than waiting on a skeleton.
          error={stats.error ?? logs.error}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">
          {RIBBON_HEADINGS[period]}
        </h2>

        <div className="rounded border border-hairline bg-surface p-4">
          {logs.error ? (
            <p className="text-14 text-fault">{logs.error}</p>
          ) : (
            <>
              {logs.isLoading || !logs.data ? (
                <DashboardRibbonsSkeleton period={period} />
              ) : (
                <ChartEntry key={period}>
                  <DashboardRibbons
                    days={logs.data.days}
                    period={period}
                    areaName={areaName}
                  />
                </ChartEntry>
              )}

              <div className="mt-4 border-t border-hairline pt-4">
                <RibbonLegend compact />
              </div>
            </>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

/** Page frame: single column, mobile-first, wide enough for the month barcode. */
function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">{children}</div>
    </main>
  );
}
