"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

export type PowerLog = Tables<"power_logs">;

/**
 * The most recent power log for an area, across all contributors — the
 * source of truth for "is power currently on or off here" and for the
 * application-layer duplicate guard (M2; see supabase/migrations comment on
 * power_logs — the schema deliberately leaves this to the app).
 *
 * The query always runs inside the async `run()` after an `await`, so no
 * setState call happens synchronously during the effect's render pass
 * (react-hooks/set-state-in-effect) — including the early "no area yet" exit.
 */
export function useLatestLog(areaId: string | null | undefined) {
  const [latestLog, setLatestLog] = useState<PowerLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!areaId) {
        setLatestLog(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("power_logs")
        .select("*")
        .eq("area_id", areaId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (fetchError) {
        setError("Couldn't load the current status. Check your connection and try again.");
      } else {
        setLatestLog(data ?? null);
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { latestLog, isLoading, error, refetch };
}
