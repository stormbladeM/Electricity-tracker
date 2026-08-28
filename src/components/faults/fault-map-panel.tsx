"use client";

import dynamic from "next/dynamic";
import { FaultMapSkeleton } from "./faults-skeleton";
import type { FaultWithPlace } from "./fault-data";

// Leaflet touches `window` at import time, so the map is client-only.
const FaultMap = dynamic(() => import("./fault-map"), {
  ssr: false,
  loading: () => <FaultMapSkeleton />,
});

/**
 * The map card for the fault feed: the Leaflet map plus a caption for the
 * faults that have no GPS pin and so only appear in the list.
 */
export function FaultMapPanel({ faults }: { faults: FaultWithPlace[] }) {
  const pinnedCount = faults.filter(
    (f) => f.latitude !== null && f.longitude !== null,
  ).length;
  const unmapped = faults.length - pinnedCount;

  return (
    <div className="flex flex-col gap-2">
      <FaultMap faults={faults} />
      <p className="text-12 text-text-muted">
        {pinnedCount === 0
          ? "No open faults have a location pin yet."
          : `${pinnedCount} ${pinnedCount === 1 ? "fault" : "faults"} pinned.`}
        {unmapped > 0 &&
          ` ${unmapped} more ${unmapped === 1 ? "fault has" : "faults have"} no location — see the list.`}
      </p>
    </div>
  );
}
