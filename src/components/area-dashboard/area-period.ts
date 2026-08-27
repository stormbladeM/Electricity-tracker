/**
 * The four windows the area dashboard reports on.
 *
 * Same three as the personal dashboard plus a 12-month window — the area view
 * is where a year of coverage is worth showing, since it aggregates every
 * contributor rather than one person's logs. The day-count → span arithmetic
 * is shared, in `@/lib/time/day-window`.
 */
import { dayWindow, type DayWindow } from "@/lib/time/day-window";

export const AREA_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

export type AreaPeriod = (typeof AREA_PERIODS)[number];

/** The month grid is the hero of this screen, so it opens on the 30-day window. */
export const DEFAULT_AREA_PERIOD: AreaPeriod = "monthly";

/** How many days each window covers, today included. */
export const AREA_PERIOD_DAY_COUNT: Record<AreaPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

/** Toggle labels. Sentence case, like every other label in the product. */
export const AREA_PERIOD_LABELS: Record<AreaPeriod, string> = {
  daily: "Today",
  weekly: "7 days",
  monthly: "30 days",
  yearly: "12 months",
};

/** The window named in a sentence, e.g. "in the last 7 days". */
export const AREA_PERIOD_PHRASES: Record<AreaPeriod, string> = {
  daily: "today",
  weekly: "in the last 7 days",
  monthly: "in the last 30 days",
  yearly: "in the last 12 months",
};

/** Read the period out of a URL search param, falling back to the default. */
export function parseAreaPeriod(value: string | string[] | undefined): AreaPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return AREA_PERIODS.find((period) => period === candidate) ?? DEFAULT_AREA_PERIOD;
}

/** The concrete span a period covers right now. */
export function areaWindow(period: AreaPeriod, now: Date): DayWindow {
  return dayWindow(AREA_PERIOD_DAY_COUNT[period], now);
}
