/**
 * The weekly pattern — what each hour of each weekday usually looks like in
 * an area. This is M7 phase 1, and it is also the model phase 2 forecasts
 * from, so both read one structure rather than each folding its own.
 *
 * 168 cells: seven weekdays (Monday first) by twenty-four hours. Each holds
 * the mean share of that hour with power, the spread across the weeks behind
 * it, and — the number everything else is judged on — how many days actually
 * contributed a known value.
 *
 * The sample count is not decoration. Four Tuesdays is what a 28-day window
 * gives you, and a mean of four numbers is a weak claim; carrying the count
 * through to the forecast is what lets the interface say so instead of
 * printing a confident-looking percentage that nothing supports.
 *
 * Folded from ribbon days rather than from raw logs, so the pattern inherits
 * the ribbon's distinctions for free: an hour nobody logged contributes
 * nothing rather than counting as an outage, and a partial hour counts in
 * proportion to the part anyone knew about.
 */
import { hourAvailability } from "@/components/area-dashboard/availability-fold";
import { weekdayIndex } from "@/components/area-dashboard/hour-of-day";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";

export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;
const CELLS = DAYS_PER_WEEK * HOURS_PER_DAY;

export type PatternCell = {
  /** 0 = Monday, matching the heatmap's rows. */
  weekday: number;
  hour: number;
  /** Mean share of the hour with power, 0–1. Null when no day knew it. */
  mean: number | null;
  /**
   * Sample standard deviation of that share across the contributing days —
   * how much this hour varies week to week. Null below two samples, because
   * one observation has no spread and pretending otherwise would report a
   * zero-width confidence interval on a single reading.
   */
  deviation: number | null;
  /** Days that contributed a known value. The sample size. */
  sampleCount: number;
  /** Logs behind those days' hours, summed. */
  logCount: number;
};

export type WeeklyPattern = {
  /** 168 cells, weekday-major. Index with `patternCell`. */
  cells: PatternCell[];
  /** Days of history folded in. */
  dayCount: number;
  /** Cells that got at least one observation. */
  observedCells: number;
  /** Logs behind the whole pattern. */
  logCount: number;
};

/** Sample standard deviation — n−1, since these are samples of a wider habit. */
function sampleDeviation(values: number[], mean: number): number | null {
  if (values.length < 2) return null;
  const sumSquares = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}

export function buildWeeklyPattern(days: DayRibbon[]): WeeklyPattern {
  const observations: number[][] = Array.from({ length: CELLS }, () => []);
  const logCounts = new Array<number>(CELLS).fill(0);

  for (const day of days) {
    const base = weekdayIndex(day.day) * HOURS_PER_DAY;
    for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
      const segment = day.segments[hour];
      if (!segment) continue;
      logCounts[base + hour] += segment.logCount;
      const availability = hourAvailability(segment);
      if (availability !== null) observations[base + hour].push(availability);
    }
  }

  const cells = observations.map((values, index) => {
    const weekday = Math.floor(index / HOURS_PER_DAY);
    const hour = index % HOURS_PER_DAY;
    if (values.length === 0) {
      return {
        weekday,
        hour,
        mean: null,
        deviation: null,
        sampleCount: 0,
        logCount: logCounts[index],
      };
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      weekday,
      hour,
      mean,
      deviation: sampleDeviation(values, mean),
      sampleCount: values.length,
      logCount: logCounts[index],
    };
  });

  return {
    cells,
    dayCount: days.length,
    observedCells: cells.filter((cell) => cell.sampleCount > 0).length,
    logCount: logCounts.reduce((sum, count) => sum + count, 0),
  };
}

export function patternCell(
  pattern: WeeklyPattern,
  weekday: number,
  hour: number,
): PatternCell {
  return pattern.cells[weekday * HOURS_PER_DAY + hour];
}

/**
 * One hour's mean across a set of weekdays, weighted by how many days each
 * cell saw — so a Tuesday with five observations counts for more than a
 * Thursday with one, rather than both counting as "a weekday".
 *
 * Returns null when no day in the group knew the hour.
 */
export function pooledMean(
  pattern: WeeklyPattern,
  weekdays: readonly number[],
  hour: number,
): { mean: number; sampleCount: number } | null {
  let weighted = 0;
  let samples = 0;

  for (const weekday of weekdays) {
    const cell = patternCell(pattern, weekday, hour);
    if (cell.mean === null) continue;
    weighted += cell.mean * cell.sampleCount;
    samples += cell.sampleCount;
  }

  return samples > 0 ? { mean: weighted / samples, sampleCount: samples } : null;
}

/** A whole weekday's mean availability across its known hours. */
export function weekdayMean(
  pattern: WeeklyPattern,
  weekday: number,
): { mean: number; sampleCount: number } | null {
  let weighted = 0;
  let samples = 0;

  for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
    const cell = patternCell(pattern, weekday, hour);
    if (cell.mean === null) continue;
    weighted += cell.mean * cell.sampleCount;
    samples += cell.sampleCount;
  }

  return samples > 0 ? { mean: weighted / samples, sampleCount: samples } : null;
}
