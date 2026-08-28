/**
 * "When is power usually on?" — the hour-of-day availability heatmap
 * (design-system.md section 4, area dashboard item 3).
 *
 * Seven rows, Monday to Sunday; each is that weekday's average availability
 * by hour, folded from every matching day in the window. Same fold as the
 * year view, bucketed by weekday instead of month — the ribbon carries it,
 * so the heatmap is seven stacked ribbons, not a new chart type.
 */
import type { DayRibbon } from "@/components/supply-ribbon/segments-from-logs";
import type { RibbonSegment } from "@/components/supply-ribbon/types";
import { foldHourly } from "./availability-fold";

export type WeekdayRibbon = {
  key: string;
  label: string;
  segments: RibbonSegment[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** getDay() is Sunday-first; shift so Monday is index 0. */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function hourOfDayRows(days: DayRibbon[]): WeekdayRibbon[] {
  const buckets: RibbonSegment[][][] = Array.from({ length: 7 }, () => []);
  for (const day of days) {
    buckets[weekdayIndex(day.day)].push(day.segments);
  }

  // A distinct anchor day per row (only the hour is read downstream) so
  // segment identities never collide between the stacked ribbons.
  return WEEKDAYS.map((label, index) => ({
    key: label,
    label,
    segments: foldHourly(buckets[index], new Date(2001, 0, 1 + index)),
  }));
}
