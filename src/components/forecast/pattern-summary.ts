/**
 * M7 phase 1's actual output: the weekly pattern said out loud.
 *
 * The project plan asks for one sentence — "power is most often available
 * 6pm–11pm on weekdays" — and that sentence is the hardest part of the
 * milestone to get honest. A heatmap can be vague and still be true; a
 * sentence commits. So every claim here clears two bars before it is made:
 *
 *   * lift — the stretch has to sit at least MIN_LIFT above the day's own
 *     average. An area that is on 60% of the time all day has no evening
 *     peak, and saying it does would invent a pattern out of rounding;
 *   * evidence — the pattern needs a fortnight of days behind it and roughly
 *     two observations per hour in the run, or there is nothing to average.
 *
 * When neither bar is cleared the honest sentence is that supply is even, and
 * that is what gets said. Nothing here degrades into a confident-sounding
 * claim as the data thins out.
 *
 * Runs wrap past midnight on purpose: "on from 22:00 to 02:00" is an ordinary
 * shape for an evening band, and a non-wrapping search would split it into two
 * weak halves and report neither.
 *
 * Clock times are 24-hour, matching the ribbon tooltips and every other time
 * in the product rather than the plan's illustrative "6pm–11pm".
 */
import { WEEKDAYS } from "@/components/area-dashboard/hour-of-day";
import {
  HOURS_PER_DAY,
  pooledMean,
  weekdayMean,
  type WeeklyPattern,
} from "./weekly-pattern";

/** Monday–Friday and Saturday–Sunday, in the Monday-first indexing. */
export const WEEKDAY_GROUP = [0, 1, 2, 3, 4] as const;
export const WEEKEND_GROUP = [5, 6] as const;

/** Runs shorter than this read as noise; longer than this read as "all day". */
const MIN_RUN_HOURS = 3;
const MAX_RUN_HOURS = 8;

/** Share points a run must clear the all-day mean by before it is a claim. */
const MIN_LIFT = 0.1;
/** Days of history below which no claim is made at all. */
const MIN_DAYS = 14;
/** Observations per hour of run, on average, before a run counts as measured. */
const MIN_SAMPLES_PER_HOUR = 2;
/** How far weekend supply must diverge from weekday before it earns a line. */
const MIN_WEEKEND_GAP = 0.08;
/** Comparing two weekdays out of seven is not a weekly pattern. */
const DAYS_NEEDED_FOR_COMPARISON = 5;

export type HourRun = {
  /** First hour of the run, 0–23. */
  startHour: number;
  /** Hours covered. Wraps past midnight when startHour + length exceeds 24. */
  length: number;
  /** Mean availability inside the run, 0–1. */
  mean: number;
  /** Distance from the group's all-day mean, in share points. Signed. */
  lift: number;
  /** Observations pooled across the run. */
  sampleCount: number;
};

export type DayExtreme = { label: string; mean: number };

export type PatternHighlights = {
  /** All-day mean for Mon–Fri, 0–1, or null when nothing is known. */
  weekdayMean: number | null;
  weekendMean: number | null;
  /** The stretch power is most often on during the week. */
  peak: HourRun | null;
  /** The stretch it is least often on. */
  trough: HourRun | null;
  /** Best and worst weekday by all-day availability, when they differ enough. */
  bestDay: DayExtreme | null;
  worstDay: DayExtreme | null;
  /** True once there is enough history to say anything at all. */
  isMeasured: boolean;
};

function clockHour(hour: number): string {
  return `${String(hour % HOURS_PER_DAY).padStart(2, "0")}:00`;
}

/** "18:00 to 23:00" — the run's span, closed at the end of its last hour. */
export function formatRun(run: HourRun): string {
  return `${clockHour(run.startHour)} to ${clockHour(run.startHour + run.length)}`;
}

export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Weighted mean across a group's whole day — the baseline a run is judged against. */
function allDayMean(
  pattern: WeeklyPattern,
  group: readonly number[],
): { mean: number; sampleCount: number } | null {
  let weighted = 0;
  let samples = 0;

  for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
    const pooled = pooledMean(pattern, group, hour);
    if (!pooled) continue;
    weighted += pooled.mean * pooled.sampleCount;
    samples += pooled.sampleCount;
  }

  return samples > 0 ? { mean: weighted / samples, sampleCount: samples } : null;
}

/**
 * The contiguous stretch of hours that stands out most from the group's own
 * all-day mean, in `direction`.
 *
 * Scored as lift × √length rather than by lift alone: the highest-lift run is
 * almost always the single best hour, and "power is usually on between 20:00
 * and 21:00" is a true statement that tells nobody anything. Weighting by
 * length pulls the answer out to the real band.
 */
function extremeRun(
  pattern: WeeklyPattern,
  group: readonly number[],
  baseline: number,
  direction: "peak" | "trough",
): HourRun | null {
  const hours = Array.from({ length: HOURS_PER_DAY }, (_, hour) =>
    pooledMean(pattern, group, hour),
  );

  let best: HourRun | null = null;
  let bestScore = 0;

  for (let start = 0; start < HOURS_PER_DAY; start += 1) {
    let weighted = 0;
    let samples = 0;

    for (let length = 1; length <= MAX_RUN_HOURS; length += 1) {
      const pooled = hours[(start + length - 1) % HOURS_PER_DAY];
      if (pooled) {
        weighted += pooled.mean * pooled.sampleCount;
        samples += pooled.sampleCount;
      }
      if (length < MIN_RUN_HOURS || samples === 0) continue;
      if (samples < length * MIN_SAMPLES_PER_HOUR) continue;

      const mean = weighted / samples;
      const lift = mean - baseline;
      const score = (direction === "peak" ? lift : -lift) * Math.sqrt(length);

      if (score > bestScore) {
        bestScore = score;
        best = { startHour: start, length, mean, lift, sampleCount: samples };
      }
    }
  }

  return best && Math.abs(best.lift) >= MIN_LIFT ? best : null;
}

type MeasuredDay = { label: string; mean: number; sampleCount: number };

/** Best and worst weekday, when the gap between them is worth mentioning. */
function dayExtremes(pattern: WeeklyPattern): {
  bestDay: DayExtreme | null;
  worstDay: DayExtreme | null;
} {
  const days: MeasuredDay[] = [];

  WEEKDAYS.forEach((label, weekday) => {
    const stats = weekdayMean(pattern, weekday);
    if (stats) days.push({ label, ...stats });
  });

  if (days.length < DAYS_NEEDED_FOR_COMPARISON) return { bestDay: null, worstDay: null };

  const sorted = [...days].sort((a, b) => b.mean - a.mean);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best.mean - worst.mean < MIN_LIFT) return { bestDay: null, worstDay: null };

  return {
    bestDay: { label: best.label, mean: best.mean },
    worstDay: { label: worst.label, mean: worst.mean },
  };
}

export function patternHighlights(pattern: WeeklyPattern): PatternHighlights {
  const weekday = allDayMean(pattern, WEEKDAY_GROUP);
  const weekend = allDayMean(pattern, WEEKEND_GROUP);

  if (pattern.dayCount < MIN_DAYS || !weekday) {
    return {
      weekdayMean: weekday?.mean ?? null,
      weekendMean: weekend?.mean ?? null,
      peak: null,
      trough: null,
      bestDay: null,
      worstDay: null,
      isMeasured: false,
    };
  }

  return {
    weekdayMean: weekday.mean,
    weekendMean: weekend?.mean ?? null,
    peak: extremeRun(pattern, WEEKDAY_GROUP, weekday.mean, "peak"),
    trough: extremeRun(pattern, WEEKDAY_GROUP, weekday.mean, "trough"),
    ...dayExtremes(pattern),
    isMeasured: true,
  };
}

/**
 * The highlights as sentences, ready to render. Sentence case, active voice,
 * specific — and few enough that a reader takes all of them.
 *
 * Returns an empty list when there is nothing supportable to say; the caller
 * shows its own "not enough logs yet" copy rather than a hedged sentence.
 */
export function patternSentences(
  highlights: PatternHighlights,
  areaName: string,
): string[] {
  if (!highlights.isMeasured || highlights.weekdayMean === null) return [];

  const lines: string[] = [];
  const dayAverage = formatShare(highlights.weekdayMean);

  if (highlights.peak) {
    lines.push(
      `On weekdays, power in ${areaName} is most often on between ${formatRun(
        highlights.peak,
      )} — ${formatShare(highlights.peak.mean)} of the time, against ${dayAverage} across the day.`,
    );
  } else {
    lines.push(
      `Power in ${areaName} is on ${dayAverage} of the time on weekdays, spread fairly evenly across the day — no hours stand out.`,
    );
  }

  if (highlights.trough) {
    lines.push(
      `The thinnest stretch is ${formatRun(highlights.trough)}, on ${formatShare(
        highlights.trough.mean,
      )} of the time.`,
    );
  }

  if (
    highlights.weekendMean !== null &&
    Math.abs(highlights.weekendMean - highlights.weekdayMean) >= MIN_WEEKEND_GAP
  ) {
    const better = highlights.weekendMean > highlights.weekdayMean;
    lines.push(
      `Weekends run ${better ? "better" : "worse"} than weekdays — ${formatShare(
        highlights.weekendMean,
      )} against ${dayAverage}.`,
    );
  }

  if (highlights.bestDay && highlights.worstDay) {
    lines.push(
      `${highlights.bestDay.label} is the strongest day at ${formatShare(
        highlights.bestDay.mean,
      )}; ${highlights.worstDay.label} the weakest at ${formatShare(
        highlights.worstDay.mean,
      )}.`,
    );
  }

  return lines;
}
