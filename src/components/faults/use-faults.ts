"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FAULT_SELECT,
  type FaultScopeColumn,
  type FaultWithPlace,
} from "./fault-data";
import { OPEN_FAULT_STATUSES } from "./fault-types";

type UseFaultsOptions = {
  column: FaultScopeColumn;
  value: string | null | undefined;
  /** Only reported/confirmed/acknowledged/in_progress. Default true. */
  openOnly?: boolean;
  /** Cap the result — the home screen wants ~3, the feed wants all. */
  limit?: number;
};

/**
 * Fault reports for one place, newest first — the feed, the map source and the
 * home screen's "faults nearby" all read through this. Same cancellable-effect
 * shape as use-latest-log.ts, with a refetch for after a confirmation.
 */
export function useFaults({ column, value, openOnly = true, limit }: UseFaultsOptions) {
  const [faults, setFaults] = useState<FaultWithPlace[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!value) {
        setFaults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      let query = supabase
        .from("fault_reports")
        .select(FAULT_SELECT)
        .eq(column, value)
        .order("reported_at", { ascending: false });

      if (openOnly) query = query.in("status", OPEN_FAULT_STATUSES);
      if (limit) query = query.limit(limit);

      const { data, error: fetchError } = await query;
      if (cancelled) return;

      if (fetchError) {
        setError("Couldn't load faults. Check your connection and try again.");
      } else {
        setFaults((data ?? []) as unknown as FaultWithPlace[]);
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [column, value, openOnly, limit, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((t) => t + 1), []);

  return { faults, isLoading, error, refetch };
}
