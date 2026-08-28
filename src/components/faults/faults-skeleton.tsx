/** Skeleton cards for the fault feed and "faults nearby". No spinners — the
 *  quality floor calls for skeletons on every async surface. */
export function FaultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading faults">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded border border-hairline bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-hairline" />
            <div className="h-3 w-16 animate-pulse rounded bg-hairline" />
          </div>
          <div className="h-5 w-full animate-pulse rounded bg-hairline" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-hairline" />
            <div className="h-3 w-24 animate-pulse rounded bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton block for the map panel. */
export function FaultMapSkeleton() {
  return (
    <div
      className="h-72 w-full animate-pulse rounded border border-hairline bg-surface"
      aria-busy="true"
      aria-label="Loading map"
    />
  );
}
