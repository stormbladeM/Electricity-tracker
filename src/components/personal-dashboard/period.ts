/**
 * The three windows the personal dashboard reports on.
 *
 * Pure and free of React so the stats hooks, the ribbons and the copy all read
 * the same window definition rather than each deriving its own boundaries.
 *
 * The boundary arithmetic — whole local days, the window ending at `now` — is
 * shared with the area dashboard and lives in `@/lib/time/day-window`; this
 * file just names the three windows and maps each to a day count.
 */
import { dayWindow, type DayWindow } from "@/lib/time/day-window";

export const PERIODS = ["daily", "weekly", "monthly"] as const;

export type Period = (typeof PERIODS)[number];

export const DEFAULT_PERIOD: Period = "daily";

/** How many days each window covers, today included. */
export const PERIOD_DAY_COUNT: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

/** Toggle labels. Sentence case, like every other label in the product. */
export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Today",
  weekly: "7 days",
  monthly: "30 days",
};

/** The window named in a sentence, e.g. "in the last 7 days". */
export const PERIOD_PHRASES: Record<Period, string> = {
  daily: "today",
  weekly: "in the last 7 days",
  monthly: "in the last 30 days",
};

export type TimeWindow = DayWindow & { period: Period };

/** Read the period out of a URL search param, falling back to the default. */
export function parsePeriod(value: string | string[] | undefined): Period {
  const candidate = Array.isArray(value) ? value[0] : value;
  return PERIODS.find((period) => period === candidate) ?? DEFAULT_PERIOD;
}

/** The concrete span a period covers right now. */
export function windowForPeriod(period: Period, now: Date): TimeWindow {
  return { period, ...dayWindow(PERIOD_DAY_COUNT[period], now) };
}
