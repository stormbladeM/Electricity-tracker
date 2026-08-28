"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminWindow } from "../ui/admin-window";
import { byState, coverageTotals, type CoverageRow } from "./coverage-grade";

/**
 * Every LGA in the country, once, then folded in the browser.
 *
 * 774 rows is a small payload and it is the whole dataset the screen needs —
 * state roll-ups, the grade distribution and the drill-down all come out of
 * the same array, so expanding a state costs nothing and there is no second
 * request to keep consistent with the first.
 */
export function useCoverage(days: AdminWindow) {
  const [rows, setRows] = useState<CoverageRow[] | null>(null);
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
      const { data, error: rpcError } = await supabase.rpc("admin_lga_coverage", {
        p_days: days,
      });

      if (cancelled) return;

      if (rpcError) {
        setError("Couldn't load coverage. Check your connection and try again.");
      } else {
        setRows(
          (data ?? []).map((row) => ({
            ...row,
            log_count: Number(row.log_count),
            contributor_count: Number(row.contributor_count),
            fault_count: Number(row.fault_count),
          })),
        );
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const states = useMemo(() => (rows ? byState(rows, days) : null), [rows, days]);
  const totals = useMemo(() => (states ? coverageTotals(states) : null), [states]);

  return { states, totals, isLoading, error };
}
