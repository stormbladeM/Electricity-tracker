"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GridEventRow, GridEventType } from "./grid-event";

/** How far back to look by default — matches the dashboard's weekly window. */
const DEFAULT_SINCE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

type RawRow = {
  id: string;
  area_id: string;
  event_type: GridEventType;
  occurred_at: string;
  window_seconds: number | string;
  distinct_contributors: number | string;
  contributing_logs: number | string;
  agreement: number | string;
};

/**
 * Recent grid events for a set of areas, newest first, straight from the
 * `grid_events` table — no RPC needed, since 0015 denormalizes lga_id/state_id
 * onto the row and the table is publicly selectable.
 *
 * Structure follows use-uptime-shift.ts: a cancelled guard, and numeric
 * columns coerced with Number() because PostgREST hands `numeric` back as a
 * string. Grading is left to grid-event.ts so every caller agrees.
 */
export function useGridEvents(areaIds: string[], sinceDays: number = DEFAULT_SINCE_DAYS) {
  const areaKey = areaIds.join(",");
  const [rows, setRows] = useState<GridEventRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      const ids = areaKey ? areaKey.split(",") : [];
      if (ids.length === 0) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const since = new Date(Date.now() - sinceDays * DAY_MS).toISOString();
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("grid_events")
        .select(
          "id, area_id, event_type, occurred_at, window_seconds, distinct_contributors, contributing_logs, agreement",
        )
        .in("area_id", ids)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError("Couldn't load recent grid events. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      setRows(
        ((data ?? []) as RawRow[]).map((row) => ({
          id: row.id,
          areaId: row.area_id,
          eventType: row.event_type,
          occurredAt: new Date(row.occurred_at),
          windowSeconds: Number(row.window_seconds),
          distinctContributors: Number(row.distinct_contributors),
          contributingLogs: Number(row.contributing_logs),
          agreement: Number(row.agreement),
        })),
      );
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaKey, sinceDays]);

  return { rows, isLoading, error };
}
