import type { ReactNode } from "react";

/**
 * One number in the admin panel.
 *
 * The user app's StatTile with the volume turned down: smaller figure, tighter
 * box, a label that reads as a column head rather than a sentence. Admin
 * screens put eight of these in a row, so each has to survive being one of
 * eight.
 *
 * On colour — the tokens each have exactly one job (docs/design-system.md
 * section 2), and "this number went up" is not one of them. Growth deltas are
 * therefore neutral text with an arrow glyph, never green-good/red-bad. The
 * only tones a tile may take are the two the tokens actually cover: `warn` for
 * degraded data (the flagged-log backlog) and `fault` for faults. Both pair
 * the colour with a word, so the meaning survives without it.
 */
export type MetricTone = "default" | "warn" | "fault";

export type MetricDelta = {
  /** Compared with the previous window of the same length. */
  direction: "up" | "down" | "flat";
  /** e.g. "12% vs previous 30 days" — already formatted. */
  label: string;
};

const TONE_CLASS: Record<MetricTone, string> = {
  default: "text-text",
  warn: "text-warn",
  fault: "text-fault",
};

const ARROW: Record<MetricDelta["direction"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const SPOKEN_DIRECTION: Record<MetricDelta["direction"], string> = {
  up: "Up",
  down: "Down",
  flat: "Level",
};

export function MetricTile({
  label,
  value,
  unit,
  hint,
  delta,
  tone = "default",
  action,
}: {
  label: string;
  /** The figure, already formatted. "—" when there is nothing to show. */
  value: string;
  unit?: string;
  hint?: string;
  delta?: MetricDelta;
  tone?: MetricTone;
  /** A link or button rendered at the foot of the tile. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-hairline bg-surface p-3">
      <p className="text-12 uppercase tracking-wide text-text-muted">{label}</p>

      <p className={`font-mono text-24 font-medium ${TONE_CLASS[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-14 font-normal text-text-muted">{unit}</span>}
      </p>

      {delta && (
        <p className="font-mono text-12 text-text-muted">
          <span aria-hidden="true">{ARROW[delta.direction]} </span>
          <span className="sr-only">{SPOKEN_DIRECTION[delta.direction]} </span>
          {delta.label}
        </p>
      )}

      {hint && <p className="text-12 text-text-muted">{hint}</p>}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** The tile's loading shape — same box, same rhythm, no numbers. */
export function MetricTileSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3"
      aria-hidden="true"
    >
      <div className="h-3 w-16 animate-pulse rounded bg-hairline" />
      <div className="h-6 w-20 animate-pulse rounded bg-hairline" />
      <div className="h-3 w-24 animate-pulse rounded bg-hairline" />
    </div>
  );
}
