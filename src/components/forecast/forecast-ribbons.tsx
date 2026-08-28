"use client";

import { HourAxis } from "@/components/personal-dashboard/hour-axis";
import { formatDayLabel } from "@/components/supply-ribbon/format";
import { RibbonRow } from "@/components/supply-ribbon/ribbon-row";
import { flatSegment } from "@/components/supply-ribbon/segment";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import { FORECAST_HORIZON_DAYS, forecastSegments, type ForecastDay } from "./baseline-forecast";

/**
 * The next seven days as forecast ribbons — the same strip as the history
 * above them, lit in `--series-1` instead of `--on`.
 *
 * The colour is not carrying the distinction on its own. The rows sit under
 * their own heading, they are labelled with days that have not happened yet,
 * every segment describes itself as likely rather than as fact, and hours the
 * model cannot speak to keep the ribbon's future-hatch. Somebody who cannot
 * tell cyan from green still cannot mistake this block for the record.
 */
const ROW_HEIGHT = 18;
const ROW_GAP = 2;
const GAP_COLOR = "var(--color-surface)";
const LABEL_WIDTH = "4.5rem";

/** "Tomorrow", then "Sat 30" — the nearest day is the one people came for. */
function forecastRowLabel(day: Date, index: number): string {
  return index === 0 ? "Tomorrow" : formatDayLabel(day);
}

export function ForecastRibbons({
  days,
  areaName,
}: {
  days: ForecastDay[];
  areaName: string;
}) {
  return (
    <div>
      <div className="flex flex-col gap-0.5">
        {days.map((forecast, index) => (
          <RibbonRow
            key={forecast.day.getTime()}
            rowLabel={forecastRowLabel(forecast.day, index)}
            labelWidth={LABEL_WIDTH}
            segments={forecastSegments(forecast)}
            label={`Forecast power in ${areaName} on ${formatDayLabel(forecast.day)}`}
            mode="forecast"
            height={ROW_HEIGHT}
            gap={ROW_GAP}
            gapColor={GAP_COLOR}
          />
        ))}
      </div>
      {/* RibbonRow lays the label out in a grid with a 0.75rem gap, so the
          axis has to clear both before its marks line up with the segments. */}
      <div style={{ paddingLeft: `calc(${LABEL_WIDTH} + 0.75rem)` }}>
        <HourAxis />
      </div>
    </div>
  );
}

const SAMPLE_START = new Date(2026, 7, 26, 9);
const SAMPLE_END = new Date(2026, 7, 26, 10);

const FORECAST_KEY = [
  { state: "on" as const, label: "Likely on" },
  { state: "off" as const, label: "Likely off" },
  { state: "unknown" as const, label: "Not enough history" },
];

/**
 * The forecast's own three states, drawn by the ribbon itself so the key can
 * never drift from what the rows paint — the same rule the measured legend
 * follows.
 */
export function ForecastLegend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3">
      {FORECAST_KEY.map(({ state, label }) => (
        <li key={state} className="flex items-center gap-2">
          <span className="w-8 shrink-0">
            <SupplyRibbon
              segments={[flatSegment(SAMPLE_START, SAMPLE_END, state)]}
              label={`${label} sample segment`}
              mode="forecast"
              height={16}
              gap={0}
              gapColor="var(--color-surface)"
            />
          </span>
          <span className="text-12 text-text">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function ForecastRibbonsSkeleton() {
  return (
    <div className="flex flex-col gap-0.5" aria-busy="true">
      {Array.from({ length: FORECAST_HORIZON_DAYS }, (_, index) => (
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
