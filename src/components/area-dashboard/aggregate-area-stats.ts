/**
 * Combine per-area outage stats into one figure for an LGA or a state.
 *
 * Each area's numbers come from `computeOutageStats` (the M3 pure function,
 * reading the derived `outage_intervals`). This layer only decides how several
 * areas combine:
 *
 *   * Uptime is an evidence-weighted mean of the areas' uptime — an area with
 *     ten times the logs pulls the state figure ten times as hard. For an LGA
 *     with a single area (today's common case) this is just that area's
 *     uptime.
 *   * Outage count is summed; the longest outage is the longest any one area
 *     saw. Both describe "somewhere in scope", which is what a state-level
 *     reader is asking.
 *   * Off-minutes is averaged across contributing areas, so the "off for X"
 *     hint reads as a typical area rather than a sum that balloons with scope.
 *
 * Areas with no logs and no intervals in the window contribute nothing and
 * are not counted — a state's figure rests only on the LGAs actually being
 * tracked.
 */
import {
  computeOutageStats,
  type OutageInterval,
} from "@/components/personal-dashboard/outage-stats";
import type { DayWindow } from "@/lib/time/day-window";

export type AreaEvidence = {
  areaId: string;
  intervals: OutageInterval[];
  logCount: number;
};

export type AggregateStats = {
  /** 0–100. Meaningful only alongside the confidence badge. */
  uptimePercent: number;
  /** Mean minutes off per contributing area, after clipping to the window. */
  offMinutes: number;
  /** Outages touching the window, summed across areas. */
  outageCount: number;
  /** Longest single outage in scope, or null if none. */
  longestMinutes: number | null;
  /** That outage hadn't ended when the intervals were last derived. */
  longestIsOngoing: boolean;
  /** Areas with at least one log or interval in the window. */
  contributingAreaCount: number;
};

export function aggregateAreaStats(
  areas: AreaEvidence[],
  window: DayWindow,
  now: Date,
): AggregateStats | null {
  let weight = 0;
  let weightedUptime = 0;
  let offMinutesSum = 0;
  let outageCount = 0;
  let contributing = 0;
  let longestMinutes: number | null = null;
  let longestIsOngoing = false;

  for (const area of areas) {
    if (area.logCount === 0 && area.intervals.length === 0) continue;

    const stats = computeOutageStats(area.intervals, window, now);
    contributing += 1;
    outageCount += stats.outageCount;
    offMinutesSum += stats.offMinutes;

    // Every contributing area gets at least weight 1, so an area known only
    // through a carried-over open outage still counts.
    const areaWeight = Math.max(area.logCount, 1);
    weight += areaWeight;
    weightedUptime += stats.uptimePercent * areaWeight;

    if (stats.longest && (longestMinutes === null || stats.longest.minutes > longestMinutes)) {
      longestMinutes = stats.longest.minutes;
      longestIsOngoing = stats.longest.isOngoing;
    }
  }

  if (contributing === 0) return null;

  return {
    uptimePercent: weight > 0 ? weightedUptime / weight : 0,
    offMinutes: offMinutesSum / contributing,
    outageCount,
    longestMinutes,
    longestIsOngoing,
    contributingAreaCount: contributing,
  };
}
