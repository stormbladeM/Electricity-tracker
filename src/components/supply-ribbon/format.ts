import { durationMinutes } from "./segment";
import type { RibbonSegment, SegmentState } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const STATE_WORDS: Record<SegmentState, string> = {
  on: "on",
  off: "off",
  "no-data": "no logs",
  unknown: "not known yet",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 24-hour wall clock, e.g. "14:00". */
export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The segment's exact interval, e.g. "14:00–15:00". */
export function formatInterval(segment: RibbonSegment): string {
  return `${formatClock(segment.start)}–${formatClock(segment.end)}`;
}

/** Row label for a week or month stack, e.g. "Mon 24". */
export function formatDayLabel(date: Date): string {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()}`;
}

/** Heading date, e.g. "26 Aug 2026". */
export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Month name alone, e.g. "Aug" — the year-view row label. */
export function formatMonthName(date: Date): string {
  return MONTH_NAMES[date.getMonth()];
}

/** Month and year, e.g. "Aug 2026". */
export function formatMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatLogCount(logCount: number): string {
  if (logCount === 0) return "No logs";
  return logCount === 1 ? "1 log" : `${logCount} logs`;
}

/**
 * What happened in this segment, in plain words.
 *
 * Flat segments read "Power on" / "No logs for this hour". Mixed segments —
 * the sub-hour case — spell out the split: "24 min on, 36 min off".
 */
export function describeState(segment: RibbonSegment): string {
  if (segment.slices.length === 1) {
    switch (segment.slices[0].state) {
      case "on":
        return "Power on";
      case "off":
        return "Power off";
      case "no-data":
        return "No logs for this hour";
      case "unknown":
        return "Not known yet";
    }
  }

  const total = durationMinutes(segment);
  return segment.slices
    .map(
      (slice) =>
        `${Math.round(slice.fraction * total)} min ${STATE_WORDS[slice.state]}`,
    )
    .join(", ");
}

/** Accessible summary announced when a segment takes focus. */
export function describeSegment(segment: RibbonSegment): string {
  return `${formatInterval(segment)}. ${describeState(segment)}. ${formatLogCount(
    segment.logCount,
  )}.`;
}
