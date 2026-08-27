/**
 * The 12-month compressed view (design-system.md section 4: "Year view — 12
 * rows, each a compressed monthly average").
 *
 * Each row is one calendar month; each of its 24 segments is that month's
 * average availability at that hour of the day, across every day and every
 * in-scope area that reported. It reads as a heat gradient down the day —
 * where a month's power tended to be, hour by hour — rather than a timeline.
 *
 * Pure and Supabase-free: it folds the daily ribbons that
 * `useAreaWindowLogs` already built over the 365-day window, so the picture
 * answers to exactly the same logs as the shorter views.
 */
import { slicedSegment } from "@/components/supply-ribbon/segment";
import { formatMonthName } from "@/components/supply-ribbon/format";
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import type { RibbonSegment, SegmentSlice } from "@/components/supply-ribbon/types";

export type MonthRibbon = {
  /** First of the month — the row's identity and the key. */
  month: Date;
  /** "Aug" — the row label. */
  label: string;
  /** 24 hourly segments, each an average across the month. */
  segments: RibbonSegment[];
};

const HOURS_PER_DAY = 24;

/** Share of the hour that was on, over the part of it anyone knew — null if
 *  the hour was entirely unknown or unlogged that day. */
function hourAvailability(segment: RibbonSegment): number | null {
  let known = 0;
  let on = 0;
  for (const slice of segment.slices) {
    if (slice.state === "on") {
      known += slice.fraction;
      on += slice.fraction;
    } else if (slice.state === "off") {
      known += slice.fraction;
    }
  }
  return known > 0 ? on / known : null;
}

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

    const segments = Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1, hour);
      const end = new Date(month.getFullYear(), month.getMonth(), 1, hour + 1);

      let sum = 0;
      let counted = 0;
      let logCount = 0;
      for (const day of monthDays) {
        const segment = day.segments[hour];
        if (!segment) continue;
        logCount += segment.logCount;
        const availability = hourAvailability(segment);
        if (availability !== null) {
          sum += availability;
          counted += 1;
        }
      }

      if (counted === 0) {
        return slicedSegment(start, end, [{ state: "no-data", fraction: 1 }], logCount);
      }

      const onShare = sum / counted;
      const slices: SegmentSlice[] = [
        { state: "on", fraction: onShare },
        { state: "off", fraction: 1 - onShare },
      ];
      return slicedSegment(
        start,
        end,
        slices.filter((slice) => slice.fraction > 0),
        logCount,
      );
    });

    return { month, label: formatMonthName(month), segments };
  });
}
