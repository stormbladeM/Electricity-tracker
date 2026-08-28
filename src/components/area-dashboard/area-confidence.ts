/**
 * How much to trust an area's numbers, graded.
 *
 * The personal dashboard has a two-step version of this (measured / sparse /
 * none). The area dashboard grades it properly, because this is the screen
 * people will screenshot and share: an uptime figure is only as good as the
 * reporting under it, and the badge says so at a glance.
 *
 * Grade is driven by two things, and the *worse* of them wins:
 *   * contributors — one reporter means no corroboration; agreement between
 *     several is what makes a figure more than one person's experience;
 *   * logs per day — below roughly one a day the intervals are mostly long
 *     stretches interpolated between distant events, i.e. assumption, not
 *     measurement.
 *
 * Thresholds are deliberately reachable — "high" is not "perfect", it is
 * "enough different people, often enough, that this holds up".
 */
export type ConfidenceGrade = "none" | "low" | "fair" | "good" | "high";

export type AreaCoverage = {
  /** Logs in the window, flagged ones excluded. */
  logCount: number;
  /** Distinct contributors behind those logs. */
  contributorCount: number;
  /** Contributing areas — 1 for a single-area LGA, more for a state. */
  areaCount: number;
  /** Days the window spans: 1, 7, 30 or 365. */
  dayCount: number;
  /** A log in the window, or an outage carried in from before it. */
  hasAnyKnowledge: boolean;
};

/** Grade order, ascending — also the number of filled bars in the meter. */
export const GRADES: ConfidenceGrade[] = ["none", "low", "fair", "good", "high"];

export function confidenceGrade(coverage: AreaCoverage): ConfidenceGrade {
  if (!coverage.hasAnyKnowledge || coverage.logCount === 0) return "none";

  const perDay = coverage.logCount / Math.max(coverage.dayCount, 1);
  const { contributorCount } = coverage;

  if (contributorCount < 2 || perDay < 1) return "low";
  if (contributorCount < 4 || perDay < 2) return "fair";
  if (contributorCount < 8 || perDay < 4) return "good";
  return "high";
}

export const GRADE_LABEL: Record<ConfidenceGrade, string> = {
  none: "No data yet",
  low: "Low confidence",
  fair: "Fair confidence",
  good: "Good confidence",
  high: "High confidence",
};

function count(value: number, singular: string): string {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

/** "Based on 340 logs from 12 contributors across 3 areas." */
export function confidenceSummary(coverage: AreaCoverage): string {
  const basis = `Based on ${count(coverage.logCount, "log")} from ${count(
    coverage.contributorCount,
    "contributor",
  )}`;
  return coverage.areaCount > 1
    ? `${basis} across ${count(coverage.areaCount, "area")}.`
    : `${basis}.`;
}

/** The nudge shown while coverage is still thin. */
export function confidenceHint(grade: ConfidenceGrade): string | null {
  if (grade === "none") return "Be the first to report here.";
  if (grade === "low" || grade === "fair") return "More reports will sharpen this.";
  return null;
}
