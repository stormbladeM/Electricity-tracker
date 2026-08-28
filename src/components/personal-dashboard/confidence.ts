/**
 * How much to trust a window's numbers, and how to say so.
 *
 * Uptime here is (window − off minutes) ÷ window, and off minutes come only
 * from intervals somebody logged. Hours nobody reported therefore count as on.
 * That is the honest default — an outage nobody reported is indistinguishable
 * from no outage — but it means a barely-logged window reads as near-perfect
 * supply. The coverage note is what stops that number lying: the ribbon hatches
 * the unreported hours, and this says how thin the evidence is underneath.
 */

/**
 * Thresholds. CLAUDE.md fixes the wording of the low-confidence line but not
 * the numbers, so:
 *
 * MIN_LOGS_PER_DAY = 2 — a day needs at least an off and the matching on to
 * describe a single outage at all. Below an average of two logs a day the
 * intervals are mostly long stretches interpolated between distant events, so
 * the uptime figure is more assumption than measurement.
 *
 * MIN_CONTRIBUTORS = 2 — one contributor means no corroboration: their missed
 * log becomes the whole area's history, and their generator-vs-grid confusion
 * becomes everyone's. Two is the smallest number where reports can agree, which
 * is the same reason fault reports carry a confirm count.
 *
 * Deliberately low bars. They mark "treat this as indicative", not "this is
 * good coverage" — the area dashboard's confidence badges (M4) grade quality
 * properly across contributors.
 */
export const MIN_LOGS_PER_DAY = 2;
export const MIN_CONTRIBUTORS = 2;

export type Coverage = {
  /** Logs in the window, flagged ones excluded. */
  logCount: number;
  /** Distinct contributors behind those logs. */
  contributorCount: number;
  /** Days the window spans — 1, 7 or 30. */
  dayCount: number;
  /**
   * Whether anything at all is known: a log inside the window, or a status
   * carried in from before it. A window with neither is empty, not 100% up.
   */
  hasAnyKnowledge: boolean;
};

export type ConfidenceLevel = "none" | "sparse" | "measured";

export function confidenceLevel({
  logCount,
  contributorCount,
  dayCount,
  hasAnyKnowledge,
}: Coverage): ConfidenceLevel {
  if (!hasAnyKnowledge) return "none";
  if (contributorCount < MIN_CONTRIBUTORS) return "sparse";
  if (logCount < MIN_LOGS_PER_DAY * dayCount) return "sparse";
  return "measured";
}

function count(value: number, singular: string): string {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

/**
 * The line under the numbers. CLAUDE.md's exact low-confidence pattern —
 * "Based on 18 logs from 3 contributors. More reports will sharpen this." —
 * with the second sentence dropped once coverage is no longer thin.
 */
export function confidenceNote(coverage: Coverage): string | null {
  const level = confidenceLevel(coverage);
  if (level === "none") return null;

  const basis = `Based on ${count(coverage.logCount, "log")} from ${count(
    coverage.contributorCount,
    "contributor",
  )}.`;

  return level === "sparse" ? `${basis} More reports will sharpen this.` : basis;
}
