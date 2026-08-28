"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AREA_PERIOD_DAY_COUNT, type AreaPeriod } from "./area-period";
import type { LgaRankRow } from "./ranking";

/**
 * The national LGA uptime table for the selected window, from the
 * `lga_uptime_ranking` Postgres function (migration 0004) — one round trip
 * for every tracked LGA in the country, which a per-LGA fetch could not do.
 *
 * Numeric columns can arrive as strings over PostgREST, so they are coerced
 * here and every consumer downstream can treat them as numbers.
 */
export function useLgaRanking(period: AreaPeriod) {
  const days = AREA_PERIOD_DAY_COUNT[period];
  const [rows, setRows] = useState<LgaRankRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("lga_uptime_ranking", {
        p_days: days,
      });

      if (cancelled) return;

      if (rpcError) {
        setError("Couldn't load the LGA ranking. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      setRows(
        (data ?? []).map((row) => ({
          ...row,
          uptime_percent: Number(row.uptime_percent),
          off_minutes: Number(row.off_minutes),
          outage_count: Number(row.outage_count),
          log_count: Number(row.log_count),
          contributor_count: Number(row.contributor_count),
          area_count: Number(row.area_count),
        })),
      );
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return { rows, isLoading, error };
}
