"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import type { RibbonSegment } from "@/components/supply-ribbon/types";
import { outageWindowSegments, type WindowLog } from "./outage-window-segments";

type FaultOutageFragmentProps = {
  areaId: string;
  /** fault.reported_at */
  from: string;
  /** fault.resolved_at, or null while the fault is still open. */
  to: string | null;
  areaLabel: string;
  gapColor?: string;
};

/**
 * A short supply ribbon covering a fault's window, built from the area's power
 * logs. Mirrors today-ribbon.tsx: a thin fetch wrapper around <SupplyRibbon>,
 * skeleton while loading, nothing at all if the area has no logs to draw.
 */
export function FaultOutageFragment({
  areaId,
  from,
  to,
  areaLabel,
  gapColor = "var(--color-surface)",
}: FaultOutageFragmentProps) {
  const [segments, setSegments] = useState<RibbonSegment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setFailed(false);

      const fromDate = new Date(from);
      const toDate = to ? new Date(to) : new Date();
      const supabase = createClient();

      const [before, within] = await Promise.all([
        supabase
          .from("power_logs")
          .select("status, logged_at")
          .eq("area_id", areaId)
          .eq("is_flagged", false)
          .lt("logged_at", fromDate.toISOString())
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("power_logs")
          .select("status, logged_at")
          .eq("area_id", areaId)
          .eq("is_flagged", false)
          .gte("logged_at", fromDate.toISOString())
          .lte("logged_at", toDate.toISOString())
          .order("logged_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (before.error || within.error) {
        setFailed(true);
        setIsLoading(false);
        return;
      }

      const logs: WindowLog[] = (within.data ?? []).map((log) => ({
        loggedAt: new Date(log.logged_at),
        status: log.status,
      }));

      setSegments(
        outageWindowSegments({
          from: fromDate,
          to: toDate,
          logs,
          statusBefore: before.data?.status ?? null,
        }),
      );
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, from, to]);

  if (failed) return null;
  if (isLoading || !segments) {
    return <SupplyRibbonSkeleton height={20} gapColor={gapColor} />;
  }

  return (
    <SupplyRibbon
      segments={segments}
      label={`Power in ${areaLabel} during this fault`}
      height={20}
      gapColor={gapColor}
    />
  );
}
