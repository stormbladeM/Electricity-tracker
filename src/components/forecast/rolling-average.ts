/**
 * Rolling 7- and 30-day averages — the last piece of M7 phase 1.
 *
 * The weekly pattern answers "when in the day", and says nothing about
 * whether things are getting better or worse. This answers that: one point
 * per day, plus a trailing mean that smooths the daily noise into a trend.
 *
 * Daily availability is computed over the hours anyone knew about, not over
 * all 24 — a day with six logged hours reports the share of those six, and
 * says so through `knownHours` rather than quietly diluting itself toward
 * zero because nobody was awake to log the other eighteen.
 *
 * The trailing mean deliberately refuses to draw on thin windows. A "7-day
 * average" over two known days is a two-day average wearing a longer name,
 * and the line going flat where the data thins is the honest rendering.
 */
import { hourAvailability } from "@/components/area-dashboard/availability-fold";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";

/** Trailing windows the trend line offers. */
export const ROLLING_WINDOWS = [7, 30] as const;
export type RollingWindow = (typeof ROLLING_WINDOWS)[number];
/** Smooths the week without hiding it — the toggle's opening state. */
export const DEFAULT_TREND_WINDOW: RollingWindow = 7;

/** Share of the window that must be known before a mean is drawn. */
const MIN_WINDOW_COVERAGE = 0.5;

export type DailyAvailability = {
  /** Local midnight of the day. */
  day: Date;
  /** Share of the day's known hours with power, 0–1. Null when nothing known. */
  share: number | null;
  /** Hours of the day anyone knew anything about, 0–24. */
  knownHours: number;
  logCount: number;
};

export type RollingPoint = DailyAvailability & {
  /** Trailing mean over the window, 0–1. Null while the window is too thin. */
  rolling: number | null;
};

/** One point per day: the share of its known hours that had power. */
export function dailyAvailability(days: DayRibbon[]): DailyAvailability[] {
  return days.map((day) => {
    let sum = 0;
    let knownHours = 0;
    let logCount = 0;

    for (const segment of day.segments) {
      logCount += segment.logCount;
      const availability = hourAvailability(segment);
      if (availability !== null) {
        sum += availability;
        knownHours += 1;
      }
    }

    return {
      day: day.day,
      share: knownHours > 0 ? sum / knownHours : null,
      knownHours,
      logCount,
    };
  });
}

/**
 * The trailing mean of the last `window` days at each point.
 *
 * Days with nothing known are skipped rather than counted as zero, and the
 * mean is withheld entirely until at least half the window is known — so the
 * line stops where the evidence stops instead of sagging toward zero through
 * a quiet fortnight.
 */
export function rollingAverage(
  series: DailyAvailability[],
  window: RollingWindow,
): RollingPoint[] {
  return series.map((point, index) => {
    const from = Math.max(0, index - window + 1);
    const slice = series.slice(from, index + 1);
    const known = slice.filter((day) => day.share !== null);

    const rolling =
      known.length >= Math.ceil(window * MIN_WINDOW_COVERAGE)
        ? known.reduce((sum, day) => sum + (day.share as number), 0) / known.length
        : null;

    return { ...point, rolling };
  });
}

export type Trend = {
  /** Mean availability over the most recent `window` days, 0–1. */
  recent: number;
  /** The same over the `window` days before those. */
  previous: number;
  /** recent − previous, in share points. */
  change: number;
};

/**
 * The most recent window against the one before it — the number the trend
 * line is drawn to make visible.
 *
 * Null unless both halves have enough known days to compare; a change
 * measured against two observations is not a change.
 */
export function trend(series: DailyAvailability[], window: RollingWindow): Trend | null {
  const recentDays = series.slice(-window).filter((day) => day.share !== null);
  const previousDays = series
    .slice(-window * 2, -window)
    .filter((day) => day.share !== null);

  const floor = Math.ceil(window * MIN_WINDOW_COVERAGE);
  if (recentDays.length < floor || previousDays.length < floor) return null;

  const mean = (days: DailyAvailability[]) =>
    days.reduce((sum, day) => sum + (day.share as number), 0) / days.length;

  const recent = mean(recentDays);
  const previous = mean(previousDays);
  return { recent, previous, change: recent - previous };
}
