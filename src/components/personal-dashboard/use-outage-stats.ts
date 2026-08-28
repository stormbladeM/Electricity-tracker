"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeOutageStats, type OutageStats } from "./outage-stats";
import { windowForPeriod, type Period } from "./period";

/**
 * Uptime, longest outage and outage count for one area over one window.
 *
 * Only intervals that overlap the window are fetched — one that ended before
 * it starts, or starts after it ends, can't contribute — and the clipping is
 * done in computeOutageStats.
 *
 * `now` is read inside the effect rather than passed in: it keeps the effect's
 * dependencies to the period and the refresh token, and it keeps every Date in
 * this component tree client-side, so a server render can't disagree with the
 * browser's timezone.
 *
 * Like the M2 hooks, the work starts after an `await`, so no setState runs
 * synchronously during the effect's render pass (react-hooks/set-state-in-effect).
 */
export function useOutageStats(
  areaId: string | null | undefined,
  period: Period,
  refreshToken = 0,
) {
  const [stats, setStats] = useState<OutageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!areaId) {
        setStats(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const now = new Date();
      const window = windowForPeriod(period, now);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("outage_intervals")
        .select("started_at, ended_at")
        .eq("area_id", areaId)
        // Overlaps the window: begins before it ends, and either hasn't ended
        // or ended after it began. An open interval always qualifies.
        .lt("started_at", window.end.toISOString())
        .or(`ended_at.is.null,ended_at.gt.${window.start.toISOString()}`)
        .order("started_at", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError("Couldn't load your outage history. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      setStats(computeOutageStats(data ?? [], window, now));
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, period, refreshToken]);

  return { stats, isLoading, error };
}
