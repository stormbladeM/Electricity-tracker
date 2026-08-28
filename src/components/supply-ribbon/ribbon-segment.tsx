"use client";

import type { KeyboardEvent } from "react";
import type { RibbonPatternIds } from "./ribbon-defs";
import { describeSegment } from "./format";
import { segmentKey } from "./segment";
import type { RibbonSegment, SegmentSlice, SegmentState } from "./types";

function fillFor(state: SegmentState, patterns: RibbonPatternIds): string {
  switch (state) {
    case "on":
      return "var(--color-on)";
    case "off":
      return "var(--color-off)";
    case "no-data":
      return `url(#${patterns.noData})`;
    case "unknown":
      return `url(#${patterns.unknown})`;
  }
}

function percent(value: number): string {
  return `${value.toFixed(4)}%`;
}

/** Where each slice starts inside the segment, as a share of it. */
function sliceOffsets(slices: readonly SegmentSlice[]): number[] {
  const offsets: number[] = [];
  let consumed = 0;
  for (const slice of slices) {
    offsets.push(consumed);
    consumed += slice.fraction;
  }
  return offsets;
}

type RibbonSegmentViewProps = {
  segment: RibbonSegment;
  index: number;
  /** Width of one segment cell as a percentage of the ribbon. */
  cellWidth: number;
  patterns: RibbonPatternIds;
  /** Roving tabindex: one tab stop per ribbon, arrow keys move within it. */
  isTabStop: boolean;
  onEnter: (index: number) => void;
  onLeave: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<SVGRectElement>) => void;
};

/**
 * One segment: its slices, plus a transparent hit rect on top that owns the
 * hover, focus and keyboard behaviour so the painted slices stay dumb.
 *
 * The data attributes let useRestorationSurge find the lit rects of a segment
 * that just came back on without another render pass.
 */
export function RibbonSegmentView({
  segment,
  index,
  cellWidth,
  patterns,
  isTabStop,
  onEnter,
  onLeave,
  onKeyDown,
}: RibbonSegmentViewProps) {
  const cellX = index * cellWidth;
  const offsets = sliceOffsets(segment.slices);

  return (
    <g data-segment-key={segmentKey(segment)}>
      {segment.slices.map((slice, sliceIndex) => {
        const x = cellX + offsets[sliceIndex] * cellWidth;
        const width = slice.fraction * cellWidth;

        return (
          <rect
            key={sliceIndex}
            x={percent(x)}
            y={0}
            width={percent(width)}
            height="100%"
            fill={fillFor(slice.state, patterns)}
            data-slice-state={slice.state}
          />
        );
      })}

      <rect
        data-segment-index={index}
        x={percent(cellX)}
        y={0}
        width={percent(cellWidth)}
        height="100%"
        fill="transparent"
        role="img"
        aria-label={describeSegment(segment)}
        tabIndex={isTabStop ? 0 : -1}
        onPointerEnter={() => onEnter(index)}
        onPointerLeave={() => onLeave(index)}
        onFocus={() => onEnter(index)}
        onBlur={() => onLeave(index)}
        onKeyDown={onKeyDown}
      />
    </g>
  );
}
