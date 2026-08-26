"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  segmentsByDay,
  type DayRibbon,
  type LoggedPoint,
} from "@/components/supply-ribbon/segments-from-logs";
import { windowForPeriod, type Period } from "./period";
import type { Coverage } from "./confidence";

export type WindowLogs = {
  /** One ribbon per day in the window, ascending. */
  days: DayRibbon[];
  coverage: Coverage;
};

/**
 * The window's raw logs, turned into a stack of daily ribbons and a coverage
 * count.
 *
 * Two things come out of the same fetch because they come from the same rows:
 * the ribbons (what supply looked like hour by hour) and the coverage behind
 * the confidence note (how many people reported it). Flagged logs are excluded
 * to match the derivation job, which skips them too — otherwise the ribbon
 * would draw hours the uptime figure doesn't believe in.
 *
 * The extra single-row query picks up the status carried in from before the
 * window, so day one starts in a known state instead of hatched.
 */
export function useWindowLogs(
  areaId: string | null | undefined,
  period: Period,
  refreshToken = 0,
) {
  const [data, setData] = useState<WindowLogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!areaId) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const now = new Date();
      const window = windowForPeriod(period, now);
      const supabase = createClient();
      const windowStart = window.start.toISOString();

      const [before, inWindow] = await Promise.all([
        supabase
          .from("power_logs")
          .select("status")
          .eq("area_id", areaId)
          .eq("is_flagged", false)
          .lt("logged_at", windowStart)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // No upper bound: the window ends at now, so "since the window began"
        // and "inside the window" are the same set of rows.
        supabase
          .from("power_logs")
          .select("status, logged_at, user_id")
          .eq("area_id", areaId)
          .eq("is_flagged", false)
          .gte("logged_at", windowStart)
          .order("logged_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (before.error || inWindow.error) {
        setError("Couldn't load your supply history. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      const rows = inWindow.data ?? [];
      const logs: LoggedPoint[] = rows.map((row) => ({
        loggedAt: new Date(row.logged_at),
        status: row.status,
      }));
      const statusBeforeWindow = before.data?.status ?? null;

      setData({
        days: segmentsByDay({
          days: window.days,
          now,
          logs,
          statusBeforeFirstDay: statusBeforeWindow,
        }),
        coverage: {
          logCount: rows.length,
          contributorCount: new Set(rows.map((row) => row.user_id)).size,
          dayCount: window.days.length,
          hasAnyKnowledge: rows.length > 0 || statusBeforeWindow !== null,
        },
      });
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, period, refreshToken]);

  return { data, isLoading, error };
}
