/**
 * One number on the dashboard: a label, the figure, and an optional hint.
 *
 * The figure is IBM Plex Mono — CLAUDE.md's data face, for counts and
 * durations. It is deliberately *not* DSEG7: the meter face is reserved for
 * the live uptime readout and the running status counter, and spending it on
 * historical stats is what would turn a deliberate reference into a novelty.
 *
 * `spoken` exists because the compact form ("4h 17m") is for the eye; screen
 * readers get "4 hours 17 minutes" instead.
 */
type StatTileProps = {
  label: string;
  /** The figure, already formatted. "—" when there's nothing to show. */
  value: string;
  /** Unit shown smaller beside the figure, e.g. "%". */
  unit?: string;
  /** Spoken form of the value, if the compact one doesn't read aloud well. */
  spoken?: string;
  /** One quiet line of context under the figure. */
  hint?: string;
  /** The hero tile is a step up the type scale and spans the row. */
  emphasis?: "hero" | "default";
};

export function StatTile({
  label,
  value,
  unit,
  spoken,
  hint,
  emphasis = "default",
}: StatTileProps) {
  const isHero = emphasis === "hero";

  return (
    <div className="flex flex-col gap-1 rounded border border-hairline bg-surface p-4">
      <p className="text-12 text-text-muted">{label}</p>

      <p
        className={`font-mono font-medium text-text ${isHero ? "text-32" : "text-24"}`}
      >
        {spoken ? (
          <>
            <span aria-hidden="true">{value}</span>
            <span className="sr-only">{spoken}</span>
          </>
        ) : (
          value
        )}
        {unit && (
          <span className="ml-1 text-16 font-normal text-text-muted">{unit}</span>
        )}
      </p>

      {hint && <p className="text-12 text-text-muted">{hint}</p>}
    </div>
  );
}

/** The tile's loading shape — same box, same rhythm, no numbers. */
export function StatTileSkeleton({ emphasis = "default" }: { emphasis?: "hero" | "default" }) {
  return (
    <div
      className="flex flex-col gap-2 rounded border border-hairline bg-surface p-4"
      aria-hidden="true"
    >
      <div className="h-3 w-20 animate-pulse rounded bg-hairline" />
      <div
        className={`animate-pulse rounded bg-hairline ${
          emphasis === "hero" ? "h-8 w-32" : "h-6 w-16"
        }`}
      />
    </div>
  );
}
