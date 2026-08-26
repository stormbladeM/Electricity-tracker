/**
 * The three windows the personal dashboard reports on, and the arithmetic that
 * turns one into a concrete span of time.
 *
 * Pure and free of React so the stats hooks, the ribbons and the copy all read
 * the same window definition rather than each deriving its own boundaries.
 *
 * Every window ends at `now`, never at the end of the calendar day: uptime for
 * "today" is uptime over the hours that have actually happened. Counting the
 * rest of the day as either on or off would be a guess, and the ribbon already
 * draws those hours as unknown.
 */
import { startOfLocalDay } from "@/components/supply-ribbon/segments-from-logs";

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

export type TimeWindow = {
  period: Period;
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

/** Read the period out of a URL search param, falling back to the default. */
export function parsePeriod(value: string | string[] | undefined): Period {
  const candidate = Array.isArray(value) ? value[0] : value;
  return PERIODS.find((period) => period === candidate) ?? DEFAULT_PERIOD;
}

/**
 * The concrete span a period covers right now.
 *
 * Days are whole local days so they line up with the ribbon rows; only the
 * last one is partial, and the ribbon hatches the part that hasn't happened.
 */
export function windowForPeriod(period: Period, now: Date): TimeWindow {
  const dayCount = PERIOD_DAY_COUNT[period];
  const firstDay = addDays(startOfLocalDay(now), -(dayCount - 1));
  const days = Array.from({ length: dayCount }, (_, index) => addDays(firstDay, index));

  return {
    period,
    start: firstDay,
    end: now,
    days,
    minutes: Math.max(0, (now.getTime() - firstDay.getTime()) / 60_000),
  };
}
