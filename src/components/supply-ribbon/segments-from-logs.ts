/**
 * Turns real power_logs rows for one area into a day of ribbon segments —
 * the live counterpart to mock-data.ts's generators. Pure and Supabase-free
 * so the fetch (src/components/home/use-today-segments.ts) stays a thin
 * wrapper and this stays reusable by any future "day" view (M3/M4).
 */
import { slicedSegment } from "./segment";
import type { RibbonSegment, SegmentSlice } from "./types";

const MINUTES_PER_HOUR = 60;

export type LoggedPoint = {
  loggedAt: Date;
  status: "on" | "off";
};

type Point = { minute: number; state: "on" | "off" };

function minutesInto(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes() + date.getSeconds() / 60;
}

function hourStart(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
}

/** State at `minute` from the last point at or before it — null if nothing was known yet. */
function stateAtMinute(points: Point[], minute: number): "on" | "off" | null {
  let state: "on" | "off" | null = null;
  for (const point of points) {
    if (point.minute > minute) break;
    state = point.state;
  }
  return state;
}

/** Slice one hour into on/off/no-data runs, sub-hour precision included. */
function slicesForHour(points: Point[], fromMinute: number, toMinute: number): SegmentSlice[] {
  const span = toMinute - fromMinute;
  const slices: SegmentSlice[] = [];
  let cursor = fromMinute;
  let current = stateAtMinute(points, fromMinute);

  for (const point of points) {
    if (point.minute <= fromMinute || point.minute >= toMinute) continue;
    slices.push({ state: current ?? "no-data", fraction: (point.minute - cursor) / span });
    cursor = point.minute;
    current = point.state;
  }

  slices.push({ state: current ?? "no-data", fraction: (toMinute - cursor) / span });
  return slices;
}

export type SegmentsFromLogsOptions = {
  /** Any Date on the target day — only its year/month/date are used. */
  day: Date;
  /** Current time. Hours at or after this render as unknown, not off. */
  now: Date;
  /** This area's logs from local midnight of `day` onward, ascending. */
  todaysLogs: LoggedPoint[];
  /** Status carried in from before local midnight, or null if unknown. */
  statusBeforeToday: "on" | "off" | null;
};

/** 24 hourly segments for one day, built from real logged events. */
export function segmentsFromLogs({
  day,
  now,
  todaysLogs,
  statusBeforeToday,
}: SegmentsFromLogsOptions): RibbonSegment[] {
  const events: Point[] = todaysLogs.map((log) => ({
    minute: minutesInto(log.loggedAt),
    state: log.status,
  }));
  const points: Point[] =
    statusBeforeToday !== null ? [{ minute: 0, state: statusBeforeToday }, ...events] : events;

  const knownUntilMinute = minutesInto(now);

  return Array.from({ length: 24 }, (_, hour) => {
    const start = hourStart(day, hour);
    const end = hourStart(day, hour + 1);
    const fromMinute = hour * MINUTES_PER_HOUR;
    const toMinute = fromMinute + MINUTES_PER_HOUR;

    if (fromMinute >= knownUntilMinute) {
      return slicedSegment(start, end, [{ state: "unknown", fraction: 1 }], 0);
    }

    const knownTo = Math.min(toMinute, knownUntilMinute);
    const slices = slicesForHour(points, fromMinute, knownTo);
    if (knownTo < toMinute) {
      slices.push({ state: "unknown", fraction: (toMinute - knownTo) / MINUTES_PER_HOUR });
    }

    const logCount = events.filter((e) => e.minute >= fromMinute && e.minute < knownTo).length;
    return slicedSegment(start, end, slices, logCount);
  });
}
