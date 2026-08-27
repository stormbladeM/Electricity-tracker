"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OutageInterval } from "@/components/personal-dashboard/outage-stats";
import { aggregateAreaStats, type AggregateStats } from "./aggregate-area-stats";
import { areaWindow, type AreaPeriod } from "./area-period";
import type { AreaCoverage } from "./area-confidence";

export type AreaStats = {
  stats: AggregateStats | null;
  coverage: AreaCoverage;
};

/**
 * Aggregate uptime, longest outage and outage count for a set of areas over
 * one window, plus the coverage the confidence badge reads.
 *
 * Two fetches from the same window: the derived intervals the stats are built
 * from, and the raw logs behind them for the coverage count. Flagged logs are
 * excluded to match the derivation job, which skips them too.
 *
 * The area set is passed as a joined key so the effect depends on a stable
 * primitive rather than a fresh array each render.
 */
export function useAreaStats(areaIds: string[], period: AreaPeriod) {
  const areaKey = areaIds.join(",");
  const [data, setData] = useState<AreaStats | null>(null);
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
      const supabase = createClient();
      const windowStart = window.start.toISOString();

      const [intervalsRes, logsRes] = await Promise.all([
        supabase
          .from("outage_intervals")
          .select("area_id, started_at, ended_at")
          .in("area_id", ids)
          // Overlaps the window: begins before it ends, and either hasn't
          // ended or ended after it began. An open interval always qualifies.
          .lt("started_at", window.end.toISOString())
          .or(`ended_at.is.null,ended_at.gt.${windowStart}`)
          .order("started_at", { ascending: true }),
        supabase
          .from("power_logs")
          .select("area_id, user_id")
          .in("area_id", ids)
          .eq("is_flagged", false)
          .gte("logged_at", windowStart),
      ]);

      if (cancelled) return;

      if (intervalsRes.error || logsRes.error) {
        setError("Couldn't load the area dashboard. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      const intervalRows = intervalsRes.data ?? [];
      const logRows = logsRes.data ?? [];

      const intervalsByArea = new Map<string, OutageInterval[]>();
      for (const row of intervalRows) {
        const bucket = intervalsByArea.get(row.area_id);
        if (bucket) bucket.push(row);
        else intervalsByArea.set(row.area_id, [row]);
      }

      const logCountByArea = new Map<string, number>();
      const contributors = new Set<string>();
      for (const row of logRows) {
        logCountByArea.set(row.area_id, (logCountByArea.get(row.area_id) ?? 0) + 1);
        contributors.add(row.user_id);
      }

      const evidence = ids.map((id) => ({
        areaId: id,
        intervals: intervalsByArea.get(id) ?? [],
        logCount: logCountByArea.get(id) ?? 0,
      }));

      const stats = aggregateAreaStats(evidence, window, now);

      setData({
        stats,
        coverage: {
          logCount: logRows.length,
          contributorCount: contributors.size,
          areaCount: stats?.contributingAreaCount ?? 0,
          dayCount: window.days.length,
          hasAnyKnowledge: logRows.length > 0 || intervalRows.length > 0,
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
