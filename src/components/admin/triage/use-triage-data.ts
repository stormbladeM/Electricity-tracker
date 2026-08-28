"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FAULT_SELECT, type FaultWithPlace } from "@/components/faults/fault-data";
import type { FaultStatus } from "@/components/faults/fault-types";
import type { Database } from "@/lib/supabase/database.types";

export type FaultMetric =
  Database["public"]["Functions"]["admin_fault_metrics"]["Returns"][number];

const QUEUE_LIMIT = 200;

/**
 * The triage queue for one group of statuses.
 *
 * Reuses the M5 feed's select and row shape — fault_reports already has
 * foreign keys to lgas, states and discos, so PostgREST embeds the place names
 * and there is nothing for an admin-only function to add. The only difference
 * is the ordering: triage reads worst-first (severity, then how many people
 * confirmed it), where the public feed reads newest-first.
 */
export function useTriageQueue(statuses: FaultStatus[]) {
  const [faults, setFaults] = useState<FaultWithPlace[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const key = statuses.join(",");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      // Rebuilt from the joined key rather than closed over, so the effect has
      // one dependency instead of a new array identity on every render.
      const inScope = key.split(",") as FaultStatus[];

      const { data, error: queryError } = await supabase
        .from("fault_reports")
        .select(FAULT_SELECT)
        .in("status", inScope)
        // severity is an enum ordered low → critical, so descending puts the
        // dangerous ones at the top of the queue.
        .order("severity", { ascending: false })
        .order("confirm_count", { ascending: false })
        .order("reported_at", { ascending: false })
        .limit(QUEUE_LIMIT);

      if (cancelled) return;

      if (queryError) {
        setError("Couldn't load the triage queue. Check your connection and try again.");
      } else {
        setFaults((data ?? []) as unknown as FaultWithPlace[]);
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [key, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { faults, isLoading, error, refetch };
}

/** Load and time-to-resolution by DisCo and by state, in one call. */
export function useFaultMetrics(days: number) {
  const [rows, setRows] = useState<FaultMetric[] | null>(null);
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
      const { data, error: rpcError } = await supabase.rpc("admin_fault_metrics", {
        p_days: days,
      });

      if (cancelled) return;

      if (rpcError) {
        setError("Couldn't load fault metrics. Check your connection and try again.");
      } else {
        // numeric arrives as a string over PostgREST; null means nothing has
        // been resolved in the window, which is not the same as zero hours.
        setRows(
          (data ?? []).map((row) => ({
            ...row,
            open_count: Number(row.open_count),
            resolved_count: Number(row.resolved_count),
            median_hours: row.median_hours == null ? null : Number(row.median_hours),
            avg_hours: row.avg_hours == null ? null : Number(row.avg_hours),
          })) as FaultMetric[],
        );
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return { rows, isLoading, error };
}

/**
 * Reports a fault could be a duplicate of: other open reports in the same LGA.
 *
 * Fetched when a triage panel opens rather than up front — most reports are
 * not duplicates, and a merge candidate is only ever wanted for the one row
 * somebody is looking at. Scoped to the LGA because that is what "the same
 * fault" means here: the same transformer, the same street.
 */
export function useMergeCandidates(faultId: string, lgaId: string) {
  const [candidates, setCandidates] = useState<FaultWithPlace[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("fault_reports")
        .select(FAULT_SELECT)
        .eq("lga_id", lgaId)
        .neq("id", faultId)
        .in("status", ["reported", "confirmed", "acknowledged", "in_progress"])
        .order("reported_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      setCandidates((data ?? []) as unknown as FaultWithPlace[]);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [faultId, lgaId]);

  return candidates;
}
