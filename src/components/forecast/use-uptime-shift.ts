"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SHIFT_BASELINE_DAYS, SHIFT_RECENT_DAYS, type UptimeShiftRow } from "./anomaly";

export { SHIFT_BASELINE_DAYS, SHIFT_RECENT_DAYS };

/**
 * Every LGA's recent uptime against its own baseline, from the
 * `lga_uptime_shift` Postgres function (migration 0014) — one round trip for
 * the whole country, which the area banner and the admin panel share.
 *
 * Classification is not done here. `anomaly.ts` decides what counts as a
 * shift worth showing, so both callers agree; this hook only fetches and
 * coerces. Numeric columns can arrive as strings over PostgREST.
 */
export function useUptimeShift(
  recentDays: number = SHIFT_RECENT_DAYS,
  baselineDays: number = SHIFT_BASELINE_DAYS,
) {
  const [rows, setRows] = useState<UptimeShiftRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("lga_uptime_shift", {
        p_recent_days: recentDays,
        p_baseline_days: baselineDays,
      });

      if (cancelled) return;

      if (rpcError) {
        setError("Couldn't load recent changes. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      setRows(
        (data ?? []).map((row) => ({
          ...row,
          recent_uptime_percent: Number(row.recent_uptime_percent),
          baseline_uptime_percent: Number(row.baseline_uptime_percent),
          delta_percent: Number(row.delta_percent),
          recent_log_count: Number(row.recent_log_count),
          baseline_log_count: Number(row.baseline_log_count),
          recent_contributor_count: Number(row.recent_contributor_count),
          baseline_contributor_count: Number(row.baseline_contributor_count),
          recent_outage_count: Number(row.recent_outage_count),
        })),
      );
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [recentDays, baselineDays, reloadToken]);

  return { rows, isLoading, error, refetch };
}
