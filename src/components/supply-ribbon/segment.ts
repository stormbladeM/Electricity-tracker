import type { RibbonSegment, SegmentSlice, SegmentState } from "./types";

/** Build a segment with one uniform state across its whole span. */
export function flatSegment(
  start: Date,
  end: Date,
  state: SegmentState,
  logCount = 0,
  note?: string,
): RibbonSegment {
  return { start, end, slices: [{ state, fraction: 1 }], logCount, note };
}

/** Build a segment from slices, normalising fractions so they sum to 1. */
export function slicedSegment(
  start: Date,
  end: Date,
  slices: SegmentSlice[],
  logCount = 0,
  note?: string,
): RibbonSegment {
  const total = slices.reduce((sum, slice) => sum + slice.fraction, 0);
  const normalised =
    total > 0
      ? slices.map((slice) => ({ ...slice, fraction: slice.fraction / total }))
      : [{ state: "no-data" as const, fraction: 1 }];
  return { start, end, slices: normalised, logCount, note };
}

/**
 * The state that occupies most of the segment. Used for the accessible summary
 * and for detecting a restoration (a segment flipping to on).
 */
export function dominantState(segment: RibbonSegment): SegmentState {
  return segment.slices.reduce((widest, slice) =>
    slice.fraction > widest.fraction ? slice : widest,
  ).state;
}

/** Share of the segment where power was on, 0–1. */
export function onFraction(segment: RibbonSegment): number {
  return segment.slices
    .filter((slice) => slice.state === "on")
    .reduce((sum, slice) => sum + slice.fraction, 0);
}

/** Stable identity for a segment across re-renders, independent of index. */
export function segmentKey(segment: RibbonSegment): string {
  return String(segment.start.getTime());
}

export function durationMinutes(segment: RibbonSegment): number {
  return Math.round((segment.end.getTime() - segment.start.getTime()) / 60_000);
}
