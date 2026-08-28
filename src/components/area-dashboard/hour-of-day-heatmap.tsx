"use client";

import { HourAxis } from "@/components/personal-dashboard/hour-axis";
import { RibbonRow } from "@/components/supply-ribbon/ribbon-row";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import type { WeekdayRibbon } from "./hour-of-day";

/**
 * Seven weekday rows, each an hour-by-hour availability average. A greener
 * block is an hour power was usually on; a hatched one is an hour nobody in
 * scope logged. Reading is by position (which weekday, which hour) as much as
 * by fill, and every block answers with its exact share on hover or focus.
 */
const ROW_HEIGHT = 16;
const ROW_GAP = 2;
const GAP_COLOR = "var(--color-surface)";
const LABEL_WIDTH = "2.5rem";

export function HourOfDayHeatmap({
  rows,
  areaName,
}: {
  rows: WeekdayRibbon[];
  areaName: string;
}) {
  return (
    <div>
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <RibbonRow
            key={row.key}
            rowLabel={row.label}
            labelWidth={LABEL_WIDTH}
            segments={row.segments}
            label={`Average power in ${areaName} on ${row.label}`}
            height={ROW_HEIGHT}
            gap={ROW_GAP}
            gapColor={GAP_COLOR}
          />
        ))}
      </div>
      <HourAxis />
    </div>
  );
}

export function HourOfDayHeatmapSkeleton() {
  return (
    <div className="flex flex-col gap-0.5" aria-busy="true">
      {Array.from({ length: 7 }, (_, index) => (
        <SupplyRibbonSkeleton
          key={index}
          height={ROW_HEIGHT}
          gap={ROW_GAP}
          gapColor={GAP_COLOR}
        />
      ))}
    </div>
  );
}
