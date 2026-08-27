"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminWindow } from "../ui/admin-window";

export type AdminOverviewStats =
  Database["public"]["Functions"]["admin_overview_stats"]["Returns"][number];

export type GrowthPoint =
  Database["public"]["Functions"]["admin_growth_series"]["Returns"][number];

export type AdminOverviewData = {
  stats: AdminOverviewStats;
  series: GrowthPoint[];
};

/**
 * The overview's two round trips — headline stats and the daily growth series
 * — issued together and surfaced as one loading state, so the page doesn't
 * assemble itself in two visible steps.
 *
 * Both are Postgres functions from migration 0007 rather than table reads:
 * "how is the whole platform doing" is a question about every row in the
 * database, and the answer has to come back already folded.
 *
 * A `numeric` column arrives from PostgREST as a string, so every figure is
 * coerced here and consumers downstream can treat them all as numbers — same
 * as useLgaRanking does for the LGA table.
 */
export function useAdminOverview(days: AdminWindow) {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const [statsResult, seriesResult] = await Promise.all([
        supabase.rpc("admin_overview_stats", { p_days: days }),
        supabase.rpc("admin_growth_series", { p_days: days }),
      ]);

      if (cancelled) return;

      const stats = statsResult.data?.[0];
      if (statsResult.error || seriesResult.error || !stats) {
        setError("Couldn't load the overview. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      setData({
        stats: toNumbers(stats),
        series: (seriesResult.data ?? []).map((point) => ({
          ...point,
          logs: Number(point.logs),
          contributors: Number(point.contributors),
          new_users: Number(point.new_users),
          faults: Number(point.faults),
        })),
      });
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { data, isLoading, error, refetch };
}

/**
 * Every field of the stats row is a count or a rate, so the coercion is a
 * blanket one — null stays null (median resolution time has no value until
 * something has been resolved).
 */
function toNumbers(stats: AdminOverviewStats): AdminOverviewStats {
  const coerced = Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [key, value == null ? null : Number(value)]),
  );

  return coerced as unknown as AdminOverviewStats;
}
