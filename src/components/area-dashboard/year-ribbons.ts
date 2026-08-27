/**
 * The 12-month compressed view (design-system.md section 4: "Year view — 12
 * rows, each a compressed monthly average").
 *
 * Each row is one calendar month; each of its 24 segments is that month's
 * average availability at that hour of the day. It reads as a heat gradient
 * down the day — where a month's power tended to be, hour by hour — rather
 * than a timeline.
 *
 * Pure and Supabase-free: it folds the daily ribbons that
 * `useAreaWindowLogs` already built over the 365-day window, so the picture
 * answers to exactly the same logs as the shorter views.
 */
import { formatMonthName } from "@/components/supply-ribbon/format";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import type { RibbonSegment } from "@/components/supply-ribbon/types";
import { foldHourly } from "./availability-fold";

export type MonthRibbon = {
  /** First of the month — the row's identity and the key. */
  month: Date;
  /** "Aug" — the row label. */
  label: string;
  /** 24 hourly segments, each an average across the month. */
  segments: RibbonSegment[];
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/**
 * Fold a run of daily ribbons into one row per calendar month, most recent
 * last (matching the day stacks). The last day in the run fixes which 12
 * months to show, so this stays pure over its input.
 */
export function monthlyAvailabilityRows(days: DayRibbon[]): MonthRibbon[] {
  if (days.length === 0) return [];
  const ref = days[days.length - 1].day;

  // The 12 months ending with the reference month, oldest first.
  const months: Date[] = Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    return new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  });

  const byMonth = new Map<string, DayRibbon[]>();
  for (const day of days) {
    const key = monthKey(day.day);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(day);
    else byMonth.set(key, [day]);
  }

  return months.map((month) => {
    const monthDays = byMonth.get(monthKey(month)) ?? [];
    return {
      month,
      label: formatMonthName(month),
      segments: foldHourly(
        monthDays.map((day) => day.segments),
        month,
      ),
    };
  });
}
