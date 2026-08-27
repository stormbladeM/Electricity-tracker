/**
 * Uptime, longest outage and outage count for one window, computed from the
 * derived `outage_intervals` rows.
 *
 * These read the derived table, never raw `power_logs`. Pairing on/off events
 * into intervals is the scheduled job's job (supabase/migrations/0003) and it
 * is the source of truth — collapsing runs of duplicate reports, skipping
 * flagged logs, leaving an in-progress outage open. Re-deriving any of that in
 * the browser would be a second implementation to keep in step, and the two
 * would eventually disagree.
 *
 * Pure on purpose: the hook fetches, this decides.
 */
import type { Tables } from "@/lib/supabase/database.types";
import type { DayWindow } from "@/lib/time/day-window";

/** The two columns the maths needs. `ended_at` null means still off. */
export type OutageInterval = Pick<Tables<"outage_intervals">, "started_at" | "ended_at">;

export type LongestOutage = {
  minutes: number;
  /** The outage hadn't ended when the intervals were last derived. */
  isOngoing: boolean;
  /** It began before this window, so the figure shown is the part inside it. */
  startedBeforeWindow: boolean;
};

export type OutageStats = {
  /** Minutes of the window spent off, after clipping to the window. */
  offMinutes: number;
  /** 0–100. Meaningful only alongside the coverage note — see confidence.ts. */
  uptimePercent: number;
  /** Outages touching the window. One spanning the boundary counts once. */
  outageCount: number;
  longest: LongestOutage | null;
};

const MS_PER_MINUTE = 60_000;

/**
 * Clip every interval to the window and add up what's left.
 *
 * Three cases the clipping exists for:
 *   - an outage that started before the window and ended inside it — the part
 *     before the boundary belongs to an earlier window, not this one;
 *   - an outage still open (`ended_at` null) — it runs to now, not forever;
 *   - an outage that started before the window and is still open — it fills
 *     the window from its start.
 *
 * Intervals from one area never overlap (they alternate off→on, at most one
 * open), so a plain sum is safe and no interval merging is needed.
 */
export function computeOutageStats(
  intervals: OutageInterval[],
  window: DayWindow,
  now: Date,
): OutageStats {
  const windowStart = window.start.getTime();
  const windowEnd = Math.min(window.end.getTime(), now.getTime());

  let offMinutes = 0;
  let outageCount = 0;
  let longest: LongestOutage | null = null;

  for (const interval of intervals) {
    const startedAt = new Date(interval.started_at).getTime();
    const endedAt = interval.ended_at ? new Date(interval.ended_at).getTime() : windowEnd;

    const from = Math.max(startedAt, windowStart);
    const to = Math.min(endedAt, windowEnd);
    if (!(to > from)) continue;

    const minutes = (to - from) / MS_PER_MINUTE;
    offMinutes += minutes;
    outageCount += 1;

    if (!longest || minutes > longest.minutes) {
      longest = {
        minutes,
        isOngoing: interval.ended_at === null,
        startedBeforeWindow: startedAt < windowStart,
      };
    }
  }

  const windowMinutes = window.minutes;
  const uptimePercent =
    windowMinutes > 0
      ? Math.min(100, Math.max(0, ((windowMinutes - offMinutes) / windowMinutes) * 100))
      : 100;

  return { offMinutes, uptimePercent, outageCount, longest };
}
