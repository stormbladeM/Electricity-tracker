/**
 * M7 phase 2: a seasonal-naive baseline forecast for the next seven days.
 *
 * The model is deliberately the simplest thing that could work — next
 * Tuesday's 19:00 is predicted as the mean of the last four Tuesdays' 19:00,
 * carried straight off the weekly pattern. That is not a placeholder for
 * something cleverer; it is the correct choice at this data volume. Grid
 * supply is strongly weekly and the honest ceiling on four observations per
 * cell is low, so a fitted model would spend its extra parameters on noise
 * and arrive with a confidence nobody had earned. CLAUDE.md decision 7 puts
 * ML behind real volume, and forecast-accuracy.ts measures whether even this
 * much beats quoting the plain average.
 *
 * Four weeks of training, not thirty days: 28 days holds exactly four of each
 * weekday, so no weekday is over-represented in its own cell and every cell
 * carries the same sample size. A 30-day window would give two weekdays five
 * observations and the rest four, which is a small bias with no upside.
 *
 * Every prediction carries the sample count it came from and an interval
 * widened by the spread behind it. An hour whose four observations were
 * 0%, 100%, 0%, 100% has a mean of 50% and a useless interval, and the ribbon
 * is expected to draw that difference rather than hide it.
 */
import { slicedSegment } from "@/components/supply-ribbon/segment";
import { startOfLocalDay } from "@/components/supply-ribbon/segments-from-logs";
import type { RibbonSegment, SegmentSlice } from "@/components/supply-ribbon/types";
import { weekdayIndex } from "@/components/area-dashboard/hour-of-day";
import type { BacktestResult } from "./forecast-accuracy";
import { HOURS_PER_DAY, patternCell, type WeeklyPattern } from "./weekly-pattern";

/** Days ahead the forecast covers, starting tomorrow. */
export const FORECAST_HORIZON_DAYS = 7;
/** Whole weeks of history the forecast trains on. */
export const TRAINING_WEEKS = 4;
export const TRAINING_DAYS = TRAINING_WEEKS * 7;
/**
 * Days of history to fetch: the training window plus one horizon, so the
 * backtest in forecast-accuracy.ts can train on the older four weeks and be
 * scored against the seven days it never saw.
 */
export const FORECAST_HISTORY_DAYS = TRAINING_DAYS + FORECAST_HORIZON_DAYS;

/**
 * Observations below which an hour is not forecast at all.
 *
 * Two points can produce a mean and a standard deviation and neither means
 * anything. Below three the hour renders as unknown — the same hatch the
 * ribbon already uses for "we can't tell you", which is the truth.
 */
export const MIN_FORECAST_SAMPLES = 3;

/** ~95% normal interval. Honest enough at n≥3; the sample count is shown too. */
const Z_95 = 1.96;

/**
 * An interval this wide has stopped being an interval.
 *
 * At four observations of a quantity that swings between 0% and 100%, the
 * arithmetic routinely returns "0%–100% likely", which is true, useless, and
 * reads as a rendering bug rather than as the admission it is. Past this width
 * the tooltip says the hour is too variable to pin down and leaves the numbers
 * out of it — the mean is still drawn, because it is still the best guess, but
 * nothing invites anyone to lean on it.
 */
const UNINFORMATIVE_WIDTH = 0.7;

export type ForecastHour = {
  start: Date;
  /** Exclusive end. */
  end: Date;
  /** Predicted share of the hour with power, 0–1. Null when unsupported. */
  expected: number | null;
  /** Half-width of the ~95% interval in share points. Null below two samples. */
  margin: number | null;
  /** Days behind the prediction. */
  sampleCount: number;
};

export type ForecastDay = {
  /** Local midnight of the forecast day — also its React key. */
  day: Date;
  hours: ForecastHour[];
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The interval's clamped ends, 0–1. Exported for the tooltip wording. */
export function forecastBounds(hour: ForecastHour): { low: number; high: number } | null {
  if (hour.expected === null) return null;
  const margin = hour.margin ?? 0;
  return {
    low: Math.max(0, hour.expected - margin),
    high: Math.min(1, hour.expected + margin),
  };
}

/**
 * Seven days of hourly predictions, starting tomorrow.
 *
 * Tomorrow rather than the next hour: today's row is already on screen as
 * measurement, and splicing a projection into its unlit tail would make one
 * ribbon mean two different things along its length.
 */
export function baselineForecast(
  pattern: WeeklyPattern,
  now: Date,
  horizonDays: number = FORECAST_HORIZON_DAYS,
): ForecastDay[] {
  const firstDay = addDays(startOfLocalDay(now), 1);

  return Array.from({ length: horizonDays }, (_, offset) => {
    const day = addDays(firstDay, offset);
    const weekday = weekdayIndex(day);

    const hours = Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
      const cell = patternCell(pattern, weekday, hour);
      const supported = cell.mean !== null && cell.sampleCount >= MIN_FORECAST_SAMPLES;

      return {
        start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour),
        end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1),
        expected: supported ? cell.mean : null,
        margin:
          supported && cell.deviation !== null
            ? (Z_95 * cell.deviation) / Math.sqrt(cell.sampleCount)
            : null,
        sampleCount: cell.sampleCount,
      };
    });

    return { day, hours };
  });
}

/**
 * A forecast day as ribbon segments, so the projection renders through the
 * same component as the measurement rather than as a second chart type.
 *
 * An unsupported hour becomes the ribbon's `unknown` hatch, which already
 * means "still in the future, and we can't say" — exactly right here. Note
 * text rides along on the segment so the tooltip can quote the interval and
 * the sample size instead of claiming the hour as fact.
 */
export function forecastSegments(forecast: ForecastDay): RibbonSegment[] {
  return forecast.hours.map((hour) => {
    const bounds = forecastBounds(hour);

    if (hour.expected === null || !bounds) {
      return slicedSegment(
        hour.start,
        hour.end,
        [{ state: "unknown", fraction: 1 }],
        0,
        hour.sampleCount === 0
          ? "No history for this hour yet"
          : `Only ${hour.sampleCount} ${hour.sampleCount === 1 ? "week" : "weeks"} of history — too thin to forecast`,
      );
    }

    const slices: SegmentSlice[] = [
      { state: "on", fraction: hour.expected },
      { state: "off", fraction: 1 - hour.expected },
    ];

    const weeks = `${hour.sampleCount} ${hour.sampleCount === 1 ? "week" : "weeks"}`;
    const note =
      bounds.high - bounds.low >= UNINFORMATIVE_WIDTH
        ? `Varies too much week to week to pin down — ${weeks} of history`
        : `${percent(bounds.low)}–${percent(bounds.high)} likely, from ${weeks}`;

    return slicedSegment(
      hour.start,
      hour.end,
      slices.filter((slice) => slice.fraction > 0),
      0,
      note,
    );
  });
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export type ForecastConfidence = "none" | "low" | "fair" | "good";

export const FORECAST_CONFIDENCE_LABEL: Record<ForecastConfidence, string> = {
  none: "Not enough history to forecast",
  low: "Low confidence forecast",
  fair: "Fair confidence forecast",
  good: "Good confidence forecast",
};

/**
 * How far the forecast can be trusted, graded.
 *
 * Coverage of the week comes first: a thousand logs that all land on Saturday
 * evenings forecast Saturday evening well and the other 160 hours not at all,
 * so the measure is how many of the 168 cells cleared the sample floor, not
 * how many logs there were.
 *
 * Coverage alone is not enough, though. An area can have every hour of the
 * week populated and still have no weekly rhythm to speak of — supply that is
 * simply erratic. Grading that "good" because the cells are full would put a
 * confident heading directly above a backtest saying the model beat nothing,
 * which is the exact overselling this milestone exists to avoid. So when the
 * measured error fails to beat the flat baseline, the grade is capped at low
 * however complete the history is. Measured skill outranks coverage.
 */
export function forecastConfidence(
  pattern: WeeklyPattern,
  accuracy?: BacktestResult,
): ForecastConfidence {
  const supported = pattern.cells.filter(
    (cell) => cell.sampleCount >= MIN_FORECAST_SAMPLES,
  ).length;
  const share = supported / pattern.cells.length;

  if (pattern.dayCount < TRAINING_DAYS / 2 || share === 0) return "none";

  const hasNoSkill =
    accuracy !== undefined &&
    accuracy.error !== null &&
    accuracy.flatError !== null &&
    accuracy.error >= accuracy.flatError;
  if (hasNoSkill) return "low";

  if (share < 0.4) return "low";
  if (share < 0.75) return "fair";
  return "good";
}

/** "Trained on 4 weeks; 121 of 168 hours have enough history." */
export function forecastBasis(pattern: WeeklyPattern): string {
  const supported = pattern.cells.filter(
    (cell) => cell.sampleCount >= MIN_FORECAST_SAMPLES,
  ).length;
  const weeks = Math.floor(pattern.dayCount / 7);

  return `Trained on ${weeks} ${weeks === 1 ? "week" : "weeks"} of logs; ${supported} of ${
    pattern.cells.length
  } hours in the week have enough history to forecast.`;
}
