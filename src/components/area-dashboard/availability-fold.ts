/**
 * Fold a set of daily ribbons into one 24-segment row of average
 * availability — the shared core of the year view (bucketed by month) and
 * the hour-of-day heatmap (bucketed by weekday).
 *
 * Each output segment is that hour's mean on-share across the days handed in,
 * over the part of the hour anyone actually knew about. A row with no
 * knowledge for an hour hatches it rather than reading as "off".
 */
import { slicedSegment } from "@/components/supply-ribbon/segment";
import type { RibbonSegment, SegmentSlice } from "@/components/supply-ribbon/types";

const HOURS_PER_DAY = 24;

/**
 * Share of the hour that was on, normalised to the part of it anyone knew —
 * null when the hour was entirely in the future or entirely unlogged.
 */
export function hourAvailability(segment: RibbonSegment): number | null {
  let known = 0;
  let on = 0;
  for (const slice of segment.slices) {
    if (slice.state === "on") {
      known += slice.fraction;
      on += slice.fraction;
    } else if (slice.state === "off") {
      known += slice.fraction;
    }
  }
  return known > 0 ? on / known : null;
}

/**
 * Average the hour-by-hour availability of `days` into one row.
 *
 * `anchor` only supplies the segment start/end dates; nothing downstream
 * reads more than the hour off them (the clock shown in the tooltip), so any
 * date on the row will do.
 */
export function foldHourly(days: RibbonSegment[][], anchor: Date): RibbonSegment[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), hour);
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), hour + 1);

    let sum = 0;
    let counted = 0;
    let logCount = 0;
    for (const segments of days) {
      const segment = segments[hour];
      if (!segment) continue;
      logCount += segment.logCount;
      const availability = hourAvailability(segment);
      if (availability !== null) {
        sum += availability;
        counted += 1;
      }
    }

    if (counted === 0) {
      return slicedSegment(start, end, [{ state: "no-data", fraction: 1 }], logCount);
    }

    const onShare = sum / counted;
    const slices: SegmentSlice[] = [
      { state: "on", fraction: onShare },
      { state: "off", fraction: 1 - onShare },
    ];
    return slicedSegment(
      start,
      end,
      slices.filter((slice) => slice.fraction > 0),
      logCount,
    );
  });
}
