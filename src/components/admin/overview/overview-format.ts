import type { MetricDelta } from "../ui/metric-tile";

/**
 * Turning the overview's raw numbers into the strings the tiles show.
 *
 * The delta is deliberately dull: a direction glyph and a percentage against
 * the previous window of the same length, with no colour and no judgement.
 * Fewer logs this week than last is a fact about coverage, not a failure, and
 * a red number would say otherwise.
 */
const FLAT_THRESHOLD_PERCENT = 1;

export function formatDelta(
  current: number,
  previous: number,
  days: number,
): MetricDelta | undefined {
  if (previous === 0 && current === 0) return undefined;

  if (previous === 0) {
    return { direction: "up", label: `from none in the previous ${days} days` };
  }

  const change = ((current - previous) / previous) * 100;

  if (Math.abs(change) < FLAT_THRESHOLD_PERCENT) {
    return { direction: "flat", label: `level with the previous ${days} days` };
  }

  return {
    direction: change > 0 ? "up" : "down",
    label: `${Math.abs(Math.round(change))}% vs previous ${days} days`,
  };
}

/** "12,480" — counts get thousands separators; they get large. */
export function formatCount(value: number | null): string {
  return value == null ? "—" : value.toLocaleString();
}

/** "58.8" — one decimal, matching the uptime figure everywhere else. */
export function formatPercent(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}
