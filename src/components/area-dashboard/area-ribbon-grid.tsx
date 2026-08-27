"use client";

import {
  DashboardRibbons,
  DashboardRibbonsSkeleton,
} from "@/components/personal-dashboard/dashboard-ribbons";
import { HourAxis } from "@/components/personal-dashboard/hour-axis";
import { formatMonthLabel } from "@/components/supply-ribbon/format";
import { RibbonRow } from "@/components/supply-ribbon/ribbon-row";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import type { AreaPeriod } from "./area-period";
import type { MonthRibbon } from "./year-ribbons";

/**
 * The ribbon at each of the four area-dashboard scales.
 *
 * Daily, weekly and monthly are the same three the personal dashboard draws —
 * so they reuse `DashboardRibbons` unchanged, fed the pooled in-scope logs.
 * The yearly view is this screen's own: twelve month rows, each an hour-of-day
 * average, with an axis because every row shares the same 0–24 span.
 */
const GAP_COLOR = "var(--color-surface)";

type AreaRibbonGridProps = {
  period: AreaPeriod;
  days: DayRibbon[];
  months: MonthRibbon[];
  areaName: string;
};

export function AreaRibbonGrid({ period, days, months, areaName }: AreaRibbonGridProps) {
  if (period === "yearly") {
    return (
      <div>
        <div className="flex flex-col gap-1">
          {months.map((row) => (
            <RibbonRow
              key={row.month.toDateString()}
              rowLabel={row.label}
              labelWidth="2.5rem"
              segments={row.segments}
              label={`Average power in ${areaName}, ${formatMonthLabel(row.month)}`}
              height={12}
              gap={1}
              gapColor={GAP_COLOR}
            />
          ))}
        </div>
        <HourAxis />
      </div>
    );
  }

  return <DashboardRibbons days={days} period={period} areaName={areaName} />;
}

export function AreaRibbonGridSkeleton({ period }: { period: AreaPeriod }) {
  if (period === "yearly") {
    return (
      <div className="flex flex-col gap-1" aria-busy="true">
        {Array.from({ length: 12 }, (_, index) => (
          <SupplyRibbonSkeleton key={index} height={12} gap={1} gapColor={GAP_COLOR} />
        ))}
      </div>
    );
  }

  return <DashboardRibbonsSkeleton period={period} />;
}
