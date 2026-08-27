/**
 * Ribbon segments for the window of one fault — the "ribbon fragment showing
 * the outage window" from docs/design-system.md's fault-card row.
 *
 * The supply ribbon's own segments-from-logs.ts is built around whole local
 * days; a fault window is an arbitrary span of a few hours to a few days, so it
 * gets its own small builder here. Same RibbonSegment shape, so <SupplyRibbon>
 * renders it unchanged.
 *
 * Each segment is an equal slice of [from, to]; its state is the last known
 * power status at the slice's midpoint. No sub-hour slicing — a fragment is a
 * glance, not the detailed day view.
 */
import { flatSegment } from "@/components/supply-ribbon/segment";
import type { RibbonSegment, SegmentState } from "@/components/supply-ribbon/types";

const MIN_SEGMENTS = 4;
const MAX_SEGMENTS = 12;
const HOUR_MS = 3_600_000;

export type WindowLog = { loggedAt: Date; status: "on" | "off" };

export type OutageWindowOptions = {
  from: Date;
  to: Date;
  /** Area logs overlapping the window, ascending. */
  logs: WindowLog[];
  /** Status carried in from before `from`, or null if unknown. */
  statusBefore: "on" | "off" | null;
};

function statusAt(logs: WindowLog[], at: number, fallback: "on" | "off" | null): SegmentState {
  let state: "on" | "off" | null = fallback;
  for (const log of logs) {
    if (log.loggedAt.getTime() > at) break;
    state = log.status;
  }
  return state ?? "no-data";
}

export function outageWindowSegments({
  from,
  to,
  logs,
  statusBefore,
}: OutageWindowOptions): RibbonSegment[] {
  const spanMs = Math.max(HOUR_MS, to.getTime() - from.getTime());
  const count = Math.min(
    MAX_SEGMENTS,
    Math.max(MIN_SEGMENTS, Math.round(spanMs / HOUR_MS)),
  );
  const step = spanMs / count;

  return Array.from({ length: count }, (_, i) => {
    const start = new Date(from.getTime() + i * step);
    const end = new Date(from.getTime() + (i + 1) * step);
    const mid = start.getTime() + step / 2;
    const state = statusAt(logs, mid, statusBefore);
    const logCount = logs.filter(
      (l) => l.loggedAt.getTime() >= start.getTime() && l.loggedAt.getTime() < end.getTime(),
    ).length;
    return flatSegment(start, end, state, logCount);
  });
}
