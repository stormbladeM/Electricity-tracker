/**
 * How wrong the forecast is — measured, and shown.
 *
 * The project plan (section 8) puts "being honest about forecast accuracy
 * rather than overselling ML" among the things worth leading with, and an
 * unmeasured forecast is exactly the thing that oversells. So the seven days
 * the model can be scored on are held out of its training, predicted as if
 * unseen, and compared against what actually happened.
 *
 * Two numbers come back, and the second is the one that matters:
 *
 *   * error — mean absolute error per hour, in share points. "On average the
 *     forecast was 14 points off."
 *   * flatError — the same score for the dumbest possible forecast, which is
 *     to ignore the hour and the weekday and quote the area's overall
 *     availability for every hour. If the weekly pattern cannot beat that,
 *     the pattern is not carrying information and the interface should say so
 *     rather than dress a constant up as a model.
 *
 * `intervalHitRate` checks the confidence intervals rather than the point
 * predictions: a well-calibrated 95% interval should contain the truth about
 * 95% of the time. Far below that and the intervals are too narrow — which,
 * on four observations per cell, is the failure to expect.
 *
 * Only hours the live forecast would actually show are scored. Scoring hours
 * the interface hatches as "not enough history" would flatter the number by
 * grading questions it refuses to answer.
 */
import { hourAvailability } from "@/components/area-dashboard/availability-fold";
import { weekdayIndex } from "@/components/area-dashboard/hour-of-day";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import {
  FORECAST_HORIZON_DAYS,
  MIN_FORECAST_SAMPLES,
  TRAINING_DAYS,
} from "./baseline-forecast";
import { buildWeeklyPattern, patternCell, HOURS_PER_DAY } from "./weekly-pattern";

export type BacktestResult = {
  /** Hours in the holdout that were both forecast and observed. */
  hoursScored: number;
  /** Mean absolute error per hour, in share points 0–1. Null if nothing scored. */
  error: number | null;
  /** The same for a flat "quote the overall average" forecast. */
  flatError: number | null;
  /** Share of scored hours whose truth fell inside the 95% interval, 0–1. */
  intervalHitRate: number | null;
  /** Days the holdout covered. */
  holdoutDays: number;
};

/** ~95% normal interval — the same constant the live forecast uses. */
const Z_95 = 1.96;

/**
 * Train on everything but the last `holdoutDays`, then score against those.
 *
 * The training slice is capped at TRAINING_DAYS so the backtested model sees
 * exactly as much history as the live one does. Scoring a four-week model
 * with a report card earned by an eight-week model would be a different kind
 * of dishonesty from the one this function exists to prevent.
 */
export function backtest(
  days: DayRibbon[],
  holdoutDays: number = FORECAST_HORIZON_DAYS,
): BacktestResult {
  const empty: BacktestResult = {
    hoursScored: 0,
    error: null,
    flatError: null,
    intervalHitRate: null,
    holdoutDays,
  };

  if (days.length < holdoutDays + 7) return empty;

  const holdout = days.slice(-holdoutDays);
  const training = days.slice(0, -holdoutDays).slice(-TRAINING_DAYS);
  if (training.length === 0) return empty;

  const pattern = buildWeeklyPattern(training);

  // The flat baseline: one number for every hour, from the same training days.
  let trainingSum = 0;
  let trainingHours = 0;
  for (const cell of pattern.cells) {
    if (cell.mean === null) continue;
    trainingSum += cell.mean * cell.sampleCount;
    trainingHours += cell.sampleCount;
  }
  if (trainingHours === 0) return empty;
  const flat = trainingSum / trainingHours;

  let absoluteError = 0;
  let flatAbsoluteError = 0;
  let inInterval = 0;
  let scored = 0;

  for (const day of holdout) {
    const weekday = weekdayIndex(day.day);

    for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
      const segment = day.segments[hour];
      if (!segment) continue;

      const observed = hourAvailability(segment);
      if (observed === null) continue;

      const cell = patternCell(pattern, weekday, hour);
      if (cell.mean === null || cell.sampleCount < MIN_FORECAST_SAMPLES) continue;

      absoluteError += Math.abs(cell.mean - observed);
      flatAbsoluteError += Math.abs(flat - observed);
      scored += 1;

      if (cell.deviation !== null) {
        const margin = (Z_95 * cell.deviation) / Math.sqrt(cell.sampleCount);
        if (Math.abs(observed - cell.mean) <= margin) inInterval += 1;
      }
    }
  }

  if (scored === 0) return empty;

  return {
    hoursScored: scored,
    error: absoluteError / scored,
    flatError: flatAbsoluteError / scored,
    intervalHitRate: inInterval / scored,
    holdoutDays,
  };
}

function points(share: number): string {
  return `${Math.round(share * 100)} points`;
}

/**
 * The result in a sentence, including the verdict against the flat baseline.
 *
 * Returns null when nothing could be scored — better to show no claim than an
 * accuracy figure resting on a handful of hours.
 */
export function accuracySentence(result: BacktestResult): string | null {
  if (result.error === null || result.flatError === null) return null;

  const opening =
    `Checked against the last ${result.holdoutDays} days it was not trained on, ` +
    `this forecast was ${points(result.error)} off per hour on average`;

  if (result.error < result.flatError) {
    return `${opening} — better than the ${points(
      result.flatError,
    )} you would get by quoting this area's overall average.`;
  }

  return `${opening}, no better than simply quoting this area's overall average. There is not yet a strong weekly rhythm here to forecast from.`;
}

/** "The 95% range held 88% of the time." Null when no interval was scorable. */
export function calibrationSentence(result: BacktestResult): string | null {
  if (result.intervalHitRate === null || result.hoursScored === 0) return null;
  return `Its 95% range held ${Math.round(result.intervalHitRate * 100)}% of the time across ${
    result.hoursScored
  } scored hours.`;
}
