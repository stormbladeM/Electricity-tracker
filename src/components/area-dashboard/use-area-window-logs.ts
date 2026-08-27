"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  segmentsByDay,
  type DayRibbon,
  type LoggedPoint,
} from "@/components/supply-ribbon/segments-from-logs";
import { areaWindow, type AreaPeriod } from "./area-period";
import type { AreaCoverage } from "./area-confidence";

export type AreaWindowLogs = {
  /** One ribbon per day in the window, ascending. */
  days: DayRibbon[];
  coverage: AreaCoverage;
};

/**
 * The window's raw logs for every in-scope area, turned into a stack of daily
 * ribbons and a coverage count.
 *
 * This is the M3 `useWindowLogs` widened from one area to a set. The logs are
 * pooled into one timeline before `segmentsByDay` runs: for an LGA scope —
 * one area today — that is exact. For a state scope it is an approximation
 * (the most recent report anywhere wins each sub-hour); the honest per-LGA
 * picture is the comparison view, built in a later pass.
 *
 * Flagged logs are excluded to match the derivation job. The extra single-row
 * query carries in the status from before the window so day one starts known
 * rather than hatched.
 */
export function useAreaWindowLogs(areaIds: string[], period: AreaPeriod) {
  const areaKey = areaIds.join(",");
  const [data, setData] = useState<AreaWindowLogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      const ids = areaKey ? areaKey.split(",") : [];
      if (ids.length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const now = new Date();
      const window = areaWindow(period, now);
      const windowStart = window.start.toISOString();
      const supabase = createClient();

      const [before, inWindow] = await Promise.all([
        supabase
          .from("power_logs")
          .select("status")
          .in("area_id", ids)
          .eq("is_flagged", false)
          .lt("logged_at", windowStart)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("power_logs")
          .select("status, logged_at, user_id")
          .in("area_id", ids)
          .eq("is_flagged", false)
          .gte("logged_at", windowStart)
          .order("logged_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (before.error || inWindow.error) {
        setError("Couldn't load the supply history. Check your connection and try again.");
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
          areaCount: ids.length,
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
  }, [areaKey, period]);

  return { data, isLoading, error };
}
