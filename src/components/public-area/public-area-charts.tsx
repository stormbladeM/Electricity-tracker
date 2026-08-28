"use client";

import { useMemo } from "react";
import { ChartEntry } from "@/components/personal-dashboard/chart-entry";
import { RibbonLegend } from "@/components/supply-ribbon/ribbon-legend";
import {
  AreaRibbonGrid,
  AreaRibbonGridSkeleton,
} from "@/components/area-dashboard/area-ribbon-grid";
import { hourOfDayRows } from "@/components/area-dashboard/hour-of-day";
import {
  HourOfDayHeatmap,
  HourOfDayHeatmapSkeleton,
} from "@/components/area-dashboard/hour-of-day-heatmap";
import { useAreaWindowLogs } from "@/components/area-dashboard/use-area-window-logs";
import { ForecastPanel } from "@/components/forecast/forecast-panel";

/**
 * The charts on the public area page — the 30-day barcode, the hour-of-day
 * heatmap, and the M7 forecast section — as a client island. The first two
 * fold from a single 30-day fetch; the forecast reads its own five-week
 * window (see useForecast) because a backtest needs days the model never saw.
 *
 * The forecast shows here as well as on the signed-in dashboard because this
 * is the page that gets shared: "when is power usually on in this LGA, and
 * what does next week look like" is the question a link arrives with.
 */
export function PublicAreaCharts({
  areaIds,
  areaName,
}: {
  areaIds: string[];
  areaName: string;
}) {
  const { data, isLoading, error } = useAreaWindowLogs(areaIds, "monthly");
  const weekdayRows = useMemo(
    () => (data ? hourOfDayRows(data.days) : []),
    [data],
  );

  if (error) {
    return <p className="text-14 text-fault">{error}</p>;
  }

  const known = data?.coverage.hasAnyKnowledge ?? false;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">The last 30 days</h2>
        <div className="rounded border border-hairline bg-surface p-4">
          {isLoading || !data ? (
            <AreaRibbonGridSkeleton period="monthly" />
          ) : known ? (
            <ChartEntry>
              <AreaRibbonGrid
                period="monthly"
                days={data.days}
                months={[]}
                areaName={areaName}
              />
            </ChartEntry>
          ) : (
            <p className="text-14 text-text-muted">No logs in the last 30 days.</p>
          )}

          <div className="mt-4 border-t border-hairline pt-4">
            <RibbonLegend compact />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">
          When power is usually on
        </h2>
        <p className="text-14 text-text-muted">Each weekday, averaged hour by hour.</p>
        <div className="rounded border border-hairline bg-surface p-4">
          {isLoading || !data ? (
            <HourOfDayHeatmapSkeleton />
          ) : known ? (
            <ChartEntry>
              <HourOfDayHeatmap rows={weekdayRows} areaName={areaName} />
            </ChartEntry>
          ) : (
            <p className="text-14 text-text-muted">
              Not enough logs yet to show a weekly pattern.
            </p>
          )}
        </div>
      </section>

      <ForecastPanel areaIds={areaIds} areaName={areaName} />
    </div>
  );
}
