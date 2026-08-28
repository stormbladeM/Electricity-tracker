"use client";

import { formatDate } from "@/components/supply-ribbon/format";
import type { RollingPoint } from "./rolling-average";

/**
 * Daily availability as bars, with the 7-day trailing mean drawn over them.
 *
 * Raw SVG rather than a charting library, matching the admin growth chart and
 * the ribbon: it is a few dozen rectangles and a polyline, and the library
 * would outweigh the screen it draws on.
 *
 * On colour — the bars are `--hairline`, not `--on`. The neons are for marks
 * and small indicators, never large fills (docs/design-system.md section 2),
 * and thirty-five lit columns is a large fill. The trend line is the mark that
 * earns `--series-1`, the token that owns forecasts and first series; the bars
 * are the quiet texture it is read against.
 *
 * A day nobody logged draws no bar at all, over an explicit axis line, so it
 * reads as a gap in the row. A day that genuinely ran at 0% draws a short stub
 * that sits above the axis. Same rule as everywhere else in this product:
 * "nobody reported" and "power was out" must never render alike.
 */
const SLOT = 10;
const BAR = 7;
const HEIGHT = 100;
const AXIS = 1;
/** A genuine 0% day still gets a visible mark, so it beats a missing one. */
const ZERO_STUB = 3;
/**
 * Headroom above a 100% value. The trend line is drawn with a non-scaling
 * stroke, so a point sitting exactly on y=0 loses its upper half to the
 * viewport edge — a full week at 100% would render as a half-thick line
 * clipped along the top. Two units keeps the whole stroke inside.
 */
const TOP_PAD = 2;

/** Usable height for a value, between the axis line and the headroom. */
const PLOT = HEIGHT - AXIS - TOP_PAD;

function pointX(index: number): number {
  return index * SLOT + SLOT / 2;
}

function pointY(share: number): number {
  return HEIGHT - AXIS - share * PLOT;
}

type TrendRun = { index: number; rolling: number }[];

/** Runs of consecutive days that have a rolling mean — one polyline each. */
function trendRuns(points: RollingPoint[]): TrendRun[] {
  const runs: TrendRun[] = [];
  let current: TrendRun = [];

  points.forEach((point, index) => {
    if (point.rolling === null) {
      if (current.length > 0) runs.push(current);
      current = [];
      return;
    }
    current.push({ index, rolling: point.rolling });
  });

  if (current.length > 0) runs.push(current);
  return runs;
}

function latestRolling(points: RollingPoint[]): number | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const { rolling } = points[index];
    if (rolling !== null) return rolling;
  }
  return null;
}

export function TrendChart({
  points,
  windowDays,
  areaName,
}: {
  points: RollingPoint[];
  windowDays: number;
  areaName: string;
}) {
  const quietDays = points.filter((point) => point.share === null).length;
  const latest = latestRolling(points);

  const summary =
    `Daily power availability in ${areaName} over ${points.length} days, ` +
    `with a ${windowDays}-day average. ` +
    (latest === null
      ? "There is not yet enough history for an average. "
      : `The average now stands at ${Math.round(latest * 100)}%. `) +
    (quietDays > 0
      ? `${quietDays} ${quietDays === 1 ? "day has" : "days have"} no logs.`
      : "Every day has logs.");

  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${Math.max(points.length, 1) * SLOT} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
      >
        {points.map((point, index) => {
          if (point.share === null) {
            return (
              <rect
                key={point.day.getTime()}
                x={index * SLOT + (SLOT - BAR) / 2}
                y={0}
                width={BAR}
                height={HEIGHT - AXIS}
                fill="transparent"
              >
                <title>{`${formatDate(point.day)}: no logs`}</title>
              </rect>
            );
          }

          const height = Math.max(ZERO_STUB, point.share * PLOT);

          return (
            <rect
              key={point.day.getTime()}
              x={index * SLOT + (SLOT - BAR) / 2}
              y={HEIGHT - AXIS - height}
              width={BAR}
              height={height}
              fill="var(--color-hairline)"
            >
              <title>
                {`${formatDate(point.day)}: ${Math.round(point.share * 100)}% on`}
              </title>
            </rect>
          );
        })}

        <rect
          x={0}
          y={HEIGHT - AXIS}
          width="100%"
          height={AXIS}
          fill="var(--color-hairline)"
        />

        {trendRuns(points).map((run) => (
          <polyline
            key={run[0].index}
            points={run
              .map((point) => `${pointX(point.index)},${pointY(point.rolling)}`)
              .join(" ")}
            fill="none"
            stroke="var(--color-series-1)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-12 text-text-muted">
          {points.length > 0 ? formatDate(points[0].day) : ""}
        </p>
        <p className="flex items-center gap-1.5 text-12 text-text-muted">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-4 shrink-0 bg-series-1"
          />
          {windowDays}-day average
        </p>
      </div>
    </div>
  );
}

export function TrendChartSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <div className="h-28 w-full animate-pulse rounded bg-hairline" />
      <div className="h-3 w-32 animate-pulse rounded bg-hairline" />
    </div>
  );
}
