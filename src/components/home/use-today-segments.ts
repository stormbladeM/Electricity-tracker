"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  segmentsFromLogs,
  type LoggedPoint,
} from "@/components/supply-ribbon/segments-from-logs";
import type { RibbonSegment } from "@/components/supply-ribbon/types";

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Builds today's ribbon for one area from real power_logs. `refreshToken`
 * lets the caller force a reload (e.g. right after a successful log) —
 * SupplyRibbon's own useRestorationSurge then detects the off→on transition
 * from the new segments and plays the surge, so nothing here triggers the
 * surge directly.
 *
 * The query always runs after an `await`, so no setState call happens
 * synchronously during the effect's render pass (react-hooks/set-state-in-effect).
 */
export function useTodaySegments(areaId: string | null | undefined, refreshToken: number) {
  const [segments, setSegments] = useState<RibbonSegment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!areaId) {
        setSegments(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      const now = new Date();
      const todayStart = startOfToday(now);

      const [beforeToday, today] = await Promise.all([
        supabase
          .from("power_logs")
          .select("status, logged_at")
          .eq("area_id", areaId)
          .lt("logged_at", todayStart.toISOString())
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("power_logs")
          .select("status, logged_at")
          .eq("area_id", areaId)
          .gte("logged_at", todayStart.toISOString())
          .order("logged_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (beforeToday.error || today.error) {
        setError("Couldn't load today's supply data. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      const todaysLogs: LoggedPoint[] = (today.data ?? []).map((log) => ({
        loggedAt: new Date(log.logged_at),
        status: log.status,
      }));

      setSegments(
        segmentsFromLogs({
          day: now,
          now,
          todaysLogs,
          statusBeforeToday: beforeToday.data?.status ?? null,
        }),
      );
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, refreshToken]);

  return { segments, isLoading, error };
}
