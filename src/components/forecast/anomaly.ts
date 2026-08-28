/**
 * Anomaly alerts: deciding which uptime shifts are worth telling anyone about.
 *
 * Migration 0014's `lga_uptime_shift` reports every LGA's recent uptime beside
 * its own baseline and the gap between them. It deliberately stops there,
 * because the same gap means different things at different sample sizes and
 * the judgement has to be identical wherever it is made — the banner a
 * contributor sees on their area dashboard and the list an admin works
 * through must never disagree about whether Ikeja is in trouble. So the
 * threshold lives here, once, the way the coverage grades do.
 *
 * Two tests, and a shift has to pass both:
 *
 *   * size — the drop has to be big enough to matter to somebody. Four points
 *     off a 60% area is a bad week, not an event.
 *   * signal — and big enough relative to how noisy the measurement is. Each
 *     window's uptime is treated as a proportion with the log count standing
 *     in for its sample size, giving a standard error per window; the shift
 *     has to clear a multiple of the two combined.
 *
 * The log count is a proxy and not a perfect one — the real sample is hours of
 * coverage, and one contributor logging forty times is not forty independent
 * observations, which is why a contributor floor sits alongside it. It is
 * conservative in the right direction: thinly-logged areas have to move a long
 * way before they raise anything, so the alerts that do fire are the ones with
 * evidence under them.
 *
 * Rises are classified too, and named. An area that has quietly got much
 * better is the same statistical event and worth the same banner — and a
 * detector that only ever reports bad news teaches people to distrust it.
 *
 * And one veto that is not statistical at all: if the *reporting rate* itself
 * swung hard between the two windows, no verdict is issued. An area where
 * three new contributors arrived last week is not being measured the same way
 * it was the week before, and the difference between the two numbers is at
 * least as likely to be about who is logging as about what the grid did.
 * Migration 0014 already clips each window to the span an area could speak
 * to; this catches the subtler case where coverage merely got denser.
 */

/** One row of `lga_uptime_shift`, numbers already coerced from PostgREST. */
export type UptimeShiftRow = {
  lga_id: string;
  lga_name: string;
  lga_slug: string | null;
  state_id: string;
  state_name: string;
  state_slug: string | null;
  recent_uptime_percent: number;
  baseline_uptime_percent: number;
  /** recent − baseline, in percentage points. */
  delta_percent: number;
  recent_log_count: number;
  baseline_log_count: number;
  recent_contributor_count: number;
  baseline_contributor_count: number;
  recent_outage_count: number;
};

export type AnomalyDirection = "drop" | "rise";
export type AnomalySeverity = "steady" | "watch" | "alert";

export type Anomaly = {
  row: UptimeShiftRow;
  severity: AnomalySeverity;
  /** Which way it moved. Meaningless when severity is "steady". */
  direction: AnomalyDirection;
  /** Absolute size of the move, in percentage points. */
  size: number;
  /** Combined standard error of the two windows, in percentage points. */
  noise: number;
};

/** Windows the shift is measured over, matching migration 0014's defaults. */
export const SHIFT_RECENT_DAYS = 7;
export const SHIFT_BASELINE_DAYS = 28;

/** Percentage points a shift must clear before it is worth raising. */
const WATCH_POINTS = 8;
const ALERT_POINTS = 15;

/** Multiples of the combined standard error each level must also clear. */
const WATCH_SIGMA = 1.5;
const ALERT_SIGMA = 2;

/** Evidence floors. Both windows must clear them; the recent one carries people. */
const WATCH_MIN_LOGS = 5;
const ALERT_MIN_LOGS = 10;
const ALERT_MIN_CONTRIBUTORS = 2;

/**
 * How far the daily reporting rate may swing between the windows before the
 * comparison is thrown out. Three times is generous — it vetoes the area that
 * went from two logs a day to fifteen, not the one that had a busy Tuesday.
 */
const MAX_REPORTING_SWING = 3;

/** Standard error of an uptime percentage, treating logs as the sample size. */
function standardError(percent: number, logCount: number): number {
  if (logCount <= 0) return 100;
  const share = Math.min(1, Math.max(0, percent / 100));
  return Math.sqrt((share * (1 - share)) / logCount) * 100;
}

/**
 * True when the two windows were reported at broadly the same rate, so the
 * uptime figures are comparable at all.
 */
function isComparable(
  row: UptimeShiftRow,
  recentDays: number,
  baselineDays: number,
): boolean {
  const recentRate = row.recent_log_count / Math.max(recentDays, 1);
  const baselineRate = row.baseline_log_count / Math.max(baselineDays, 1);
  if (recentRate === 0 || baselineRate === 0) return false;

  const swing = Math.max(recentRate / baselineRate, baselineRate / recentRate);
  return swing <= MAX_REPORTING_SWING;
}

export function classifyShift(
  row: UptimeShiftRow,
  recentDays: number = SHIFT_RECENT_DAYS,
  baselineDays: number = SHIFT_BASELINE_DAYS,
): Anomaly {
  const size = Math.abs(row.delta_percent);
  const direction: AnomalyDirection = row.delta_percent < 0 ? "drop" : "rise";
  const noise = Math.hypot(
    standardError(row.recent_uptime_percent, row.recent_log_count),
    standardError(row.baseline_uptime_percent, row.baseline_log_count),
  );

  const minLogs = Math.min(row.recent_log_count, row.baseline_log_count);
  const comparable = isComparable(row, recentDays, baselineDays);

  const isAlert =
    comparable &&
    size >= ALERT_POINTS &&
    size >= noise * ALERT_SIGMA &&
    minLogs >= ALERT_MIN_LOGS &&
    row.recent_contributor_count >= ALERT_MIN_CONTRIBUTORS;

  const isWatch =
    comparable &&
    size >= WATCH_POINTS &&
    size >= noise * WATCH_SIGMA &&
    minLogs >= WATCH_MIN_LOGS;

  return {
    row,
    severity: isAlert ? "alert" : isWatch ? "watch" : "steady",
    direction,
    size,
    noise,
  };
}

/** Everything that moved, worst drop first. Steady areas are dropped. */
export function detectAnomalies(rows: UptimeShiftRow[]): Anomaly[] {
  return rows
    .map((row) => classifyShift(row))
    .filter((anomaly) => anomaly.severity !== "steady")
    .sort((a, b) => a.row.delta_percent - b.row.delta_percent);
}

/** One LGA's shift, or null when it is not in the rows or has not moved. */
export function anomalyFor(rows: UptimeShiftRow[], lgaId: string | null): Anomaly | null {
  if (!lgaId) return null;
  const row = rows.find((candidate) => candidate.lga_id === lgaId);
  if (!row) return null;
  const anomaly = classifyShift(row);
  return anomaly.severity === "steady" ? null : anomaly;
}

export const SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  steady: "Steady",
  watch: "Worth watching",
  alert: "Sharp change",
};

function points(value: number): string {
  return `${Math.round(value)} points`;
}

/** "Power in Ikeja is down 22 points on the last four weeks." */
export function anomalyHeadline(anomaly: Anomaly, areaName?: string): string {
  const where = areaName ?? anomaly.row.lga_name;
  const verb = anomaly.direction === "drop" ? "down" : "up";
  return `Power in ${where} is ${verb} ${points(anomaly.size)} on its recent normal.`;
}

/** The numbers under the headline, spelled out. */
export function anomalyDetail(anomaly: Anomaly, recentDays: number): string {
  const { row } = anomaly;
  return (
    `${Math.round(row.recent_uptime_percent)}% uptime over the last ${recentDays} days, ` +
    `against ${Math.round(row.baseline_uptime_percent)}% over the weeks before. ` +
    `Based on ${row.recent_log_count} recent ${
      row.recent_log_count === 1 ? "log" : "logs"
    } from ${row.recent_contributor_count} ${
      row.recent_contributor_count === 1 ? "contributor" : "contributors"
    }.`
  );
}
