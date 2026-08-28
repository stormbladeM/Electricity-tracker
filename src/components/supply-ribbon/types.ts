/**
 * Data shape for the supply ribbon. See docs/design-system.md section 4.
 *
 * A ribbon is an ordered list of segments. A segment is normally one hour, but
 * nothing here assumes 24 of them or assumes an hour — a fault-card fragment is
 * six segments, a year row is twelve. Segment count and duration fall out of
 * the data, so every variant in the product is the same component with
 * different segments.
 */

/**
 * What we know about supply during a slice of time.
 *
 * `off` and `no-data` are deliberately different states: "we know the power was
 * out" is not "nobody told us". `unknown` is the future — an unlit hour at 8pm
 * tomorrow means we don't know yet, not that power will be out.
 */
export type SegmentState = "on" | "off" | "no-data" | "unknown";

/**
 * Whether a ribbon shows what happened or what is expected to.
 *
 * The two are the same shape — a share of each hour with power — but they are
 * not the same claim, so they must not look or read alike. A forecast ribbon
 * lights in `--series-1`, the token reserved for forecasts, and its segments
 * describe themselves as projections. Nothing else about the component
 * changes: one ribbon, two registers.
 */
export type RibbonMode = "measured" | "forecast";

/**
 * A run of one state inside a segment, left to right. This is what gives the
 * ribbon sub-hour precision: an hour where power came back at :24 is two
 * slices, not a rounded-off whole-hour verdict.
 */
export type SegmentSlice = {
  state: SegmentState;
  /** Share of the segment this slice covers, 0–1. Slices sum to 1. */
  fraction: number;
};

export type RibbonSegment = {
  /** Inclusive start of the interval the segment covers. */
  start: Date;
  /** Exclusive end. */
  end: Date;
  /** Ordered left to right. A single-slice segment is a flat hour. */
  slices: SegmentSlice[];
  /** Power logs backing this segment — shown in the tooltip as confidence. */
  logCount: number;
  /**
   * An extra line for the tooltip and the accessible summary — the forecast's
   * interval and sample size ("68%–92% likely, from 4 weeks"). Optional
   * because a measured segment has nothing to add beyond its own slices.
   */
  note?: string;
};
