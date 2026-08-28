/**
 * Turns real power_logs rows for one area into ribbon segments — the live
 * counterpart to mock-data.ts's generators. Pure and Supabase-free so the
 * fetches (src/components/home/use-today-segments.ts, the personal dashboard's
 * use-window-logs.ts) stay thin wrappers and this stays reusable by any day,
 * week or month view.
 *
 * `segmentsFromLogs` builds one day; `segmentsByDay` builds a run of days from
 * a single flat list of logs, carrying status across midnight. A week stack and
 * a month barcode are the same function with a longer list of days.
 */
import { slicedSegment } from "./segment";
import type { RibbonSegment, SegmentSlice } from "./types";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

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

/** Local midnight of the calendar day `date` falls on. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * How much of `day` has actually happened by `now`, in minutes.
 *
 * The distinction matters once the ribbon shows days other than today: a past
 * day is knowable end to end, today stops at the current minute, and a day
 * still ahead is entirely unknown. Without this a 3am hour last Tuesday would
 * render as "not known yet" simply because it is 2am right now.
 */
function knownMinutes(day: Date, now: Date): number {
  const dayStart = startOfLocalDay(day).getTime();
  const todayStart = startOfLocalDay(now).getTime();
  if (dayStart > todayStart) return 0;
  if (dayStart < todayStart) return MINUTES_PER_DAY;
  return minutesInto(now);
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
  /** This area's logs on `day` itself, ascending. */
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

  const knownUntilMinute = knownMinutes(day, now);

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

/** One day's worth of ribbon, ready to stack. */
export type DayRibbon = {
  /** Local midnight of the day this row covers — also its React key. */
  day: Date;
  segments: RibbonSegment[];
};

export type SegmentsByDayOptions = {
  /** The days to build, ascending. Any Date within each day works. */
  days: Date[];
  now: Date;
  /** Every log in the whole span, ascending. Bucketed here, per local day. */
  logs: LoggedPoint[];
  /** Status carried in from before the first day, or null if unknown. */
  statusBeforeFirstDay: "on" | "off" | null;
};

/**
 * A stack of daily ribbons from one flat list of logs — the week view and the
 * month barcode.
 *
 * Status carries across midnight: a day with no logs of its own inherits the
 * last known state rather than going blank, which is what makes a multi-day
 * outage read as one continuous dark run instead of one dark day followed by
 * hatching.
 */
export function segmentsByDay({
  days,
  now,
  logs,
  statusBeforeFirstDay,
}: SegmentsByDayOptions): DayRibbon[] {
  const byDay = new Map<string, LoggedPoint[]>();
  for (const log of logs) {
    const key = startOfLocalDay(log.loggedAt).toDateString();
    const bucket = byDay.get(key);
    if (bucket) bucket.push(log);
    else byDay.set(key, [log]);
  }

  let carried = statusBeforeFirstDay;

  return days.map((date) => {
    const day = startOfLocalDay(date);
    const todaysLogs = byDay.get(day.toDateString()) ?? [];
    const segments = segmentsFromLogs({
      day,
      now,
      todaysLogs,
      statusBeforeToday: carried,
    });

    const last = todaysLogs[todaysLogs.length - 1];
    if (last) carried = last.status;

    return { day, segments };
  });
}
