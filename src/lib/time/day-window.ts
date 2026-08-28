/**
 * A span of whole local days ending at `now` — the shape every dashboard
 * window reduces to.
 *
 * The personal dashboard (daily/weekly/monthly) and the area dashboard
 * (which adds a 12-month window) both need "the last N days, up to this
 * minute" with the same boundary rules, so the arithmetic lives here once
 * rather than in each feature's period file.
 *
 * The window always ends at `now`, never at the end of the calendar day:
 * uptime for "today" is uptime over the hours that have actually happened.
 * Counting the rest of the day as on or off would be a guess, and the ribbon
 * already draws those hours as unknown.
 */
import { startOfLocalDay } from "@/components/supply-ribbon/segments-from-logs";

export type DayWindow = {
  /** Local midnight of the first day in the window. */
  start: Date;
  /** `now` — the window never runs into the future. */
  end: Date;
  /** Local midnight of each day in the window, ascending. */
  days: Date[];
  /** Elapsed minutes between start and end — the uptime denominator. */
  minutes: number;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * The concrete span covering `dayCount` whole local days up to `now`.
 *
 * Days are whole local days so they line up with the ribbon rows; only the
 * last one is partial, and the ribbon hatches the part that hasn't happened.
 */
export function dayWindow(dayCount: number, now: Date): DayWindow {
  const firstDay = addDays(startOfLocalDay(now), -(dayCount - 1));
  const days = Array.from({ length: dayCount }, (_, index) => addDays(firstDay, index));

  return {
    start: firstDay,
    end: now,
    days,
    minutes: Math.max(0, (now.getTime() - firstDay.getTime()) / 60_000),
  };
}
