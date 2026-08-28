"use client";

import { describeState, formatInterval, formatLogCount } from "./format";
import { dominantState } from "./segment";
import type { RibbonSegment } from "./types";

/** Keep the tooltip inside the ribbon's own width at 320px. */
function anchor(centerPercent: number) {
  if (centerPercent <= 12) return { left: "0%", transform: "translateX(0)" };
  if (centerPercent >= 88) return { left: "100%", transform: "translateX(-100%)" };
  return { left: `${centerPercent}%`, transform: "translateX(-50%)" };
}

type RibbonTooltipProps = {
  segment: RibbonSegment;
  /** Horizontal centre of the segment, as a percentage of the ribbon. */
  centerPercent: number;
};

/**
 * The exact interval and the logs behind it. Purely visual — the same words
 * already reach assistive tech through each segment's aria-label, so this is
 * hidden from it rather than announced twice.
 */
export function RibbonTooltip({ segment, centerPercent }: RibbonTooltipProps) {
  const isFlatNoData =
    segment.slices.length === 1 && dominantState(segment) === "no-data";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-56 rounded border border-hairline bg-surface px-2 py-1.5"
      style={anchor(centerPercent)}
    >
      <p className="font-mono text-12 text-text">{formatInterval(segment)}</p>
      <p className="text-12 text-text-muted">
        {isFlatNoData
          ? "No logs for this hour"
          : `${describeState(segment)} · ${formatLogCount(segment.logCount)}`}
      </p>
    </div>
  );
}
