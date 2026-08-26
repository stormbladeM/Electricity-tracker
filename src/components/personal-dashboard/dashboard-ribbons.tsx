"use client";

import { formatDate, formatDayLabel } from "@/components/supply-ribbon/format";
import { RibbonRow } from "@/components/supply-ribbon/ribbon-row";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import { HourAxis } from "./hour-axis";
import { PERIOD_DAY_COUNT, type Period } from "./period";

/**
 * The ribbon at each of the three scales: one strip for today, seven stacked
 * for the week, thirty for the month barcode (docs/design-system.md section 4).
 *
 * It is the same component every time — only the height, the gap and the row
 * label change. Rows get shorter and gaps tighter as the stack grows, which is
 * what turns thirty days into a barcode instead of thirty separate charts.
 */
const ROW_HEIGHT: Record<Period, number> = { daily: 32, weekly: 18, monthly: 10 };
const ROW_GAP: Record<Period, number> = { daily: 2, weekly: 2, monthly: 1 };

/** Ribbons sit on a --surface card, so the gaps show that surface through. */
const GAP_COLOR = "var(--color-surface)";

type DashboardRibbonsProps = {
  days: DayRibbon[];
  period: Period;
  areaName: string;
};

export function DashboardRibbons({ days, period, areaName }: DashboardRibbonsProps) {
  if (period === "daily") {
    const today = days[days.length - 1];
    if (!today) return null;

    return (
      <div>
        <SupplyRibbon
          segments={today.segments}
          label={`Power in ${areaName} on ${formatDate(today.day)}`}
          height={ROW_HEIGHT.daily}
          gap={ROW_GAP.daily}
          gapColor={GAP_COLOR}
        />
        <HourAxis />
      </div>
    );
  }

  return (
    <div className={period === "monthly" ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      {days.map(({ day, segments }) => (
        <RibbonRow
          key={day.toDateString()}
          rowLabel={formatDayLabel(day)}
          labelWidth="3.5rem"
          segments={segments}
          label={`Power in ${areaName} on ${formatDate(day)}`}
          height={ROW_HEIGHT[period]}
          gap={ROW_GAP[period]}
          gapColor={GAP_COLOR}
        />
      ))}
    </div>
  );
}

/** Skeleton ribbons in the shape the period is about to fill — never a spinner. */
export function DashboardRibbonsSkeleton({ period }: { period: Period }) {
  const rows = PERIOD_DAY_COUNT[period];

  return (
    <div
      className={period === "monthly" ? "flex flex-col gap-1" : "flex flex-col gap-2"}
      aria-busy="true"
    >
      {Array.from({ length: rows }, (_, index) => (
        <SupplyRibbonSkeleton
          key={index}
          height={ROW_HEIGHT[period]}
          gap={ROW_GAP[period]}
          gapColor={GAP_COLOR}
        />
      ))}
    </div>
  );
}
