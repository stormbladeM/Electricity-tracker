import { durationMinutes } from "./segment";
import type { RibbonMode, RibbonSegment, SegmentState } from "./types";

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

/**
 * The same states in the conditional. A forecast segment must never read as
 * a record of what happened — "Power on" and "Power likely on" are different
 * claims, and the ribbon says which one it is making.
 */
const FORECAST_STATE_WORDS: Record<SegmentState, string> = {
  on: "likely on",
  off: "likely off",
  "no-data": "no history",
  unknown: "not forecast",
};

const FLAT_MEASURED: Record<SegmentState, string> = {
  on: "Power on",
  off: "Power off",
  "no-data": "No logs for this hour",
  unknown: "Not known yet",
};

const FLAT_FORECAST: Record<SegmentState, string> = {
  on: "Power likely on",
  off: "Power likely off",
  "no-data": "No history for this hour",
  unknown: "Not enough history to forecast",
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
export function describeState(
  segment: RibbonSegment,
  mode: RibbonMode = "measured",
): string {
  const isForecast = mode === "forecast";

  if (segment.slices.length === 1) {
    return (isForecast ? FLAT_FORECAST : FLAT_MEASURED)[segment.slices[0].state];
  }

  const words = isForecast ? FORECAST_STATE_WORDS : STATE_WORDS;
  const total = durationMinutes(segment);
  return segment.slices
    .map((slice) => `${Math.round(slice.fraction * total)} min ${words[slice.state]}`)
    .join(", ");
}

/**
 * Accessible summary announced when a segment takes focus.
 *
 * A segment's own note takes the place of the log count where it has one: a
 * forecast has no logs of its own, and "no logs" said about a prediction reads
 * as a data gap rather than as the interval it actually is.
 */
export function describeSegment(
  segment: RibbonSegment,
  mode: RibbonMode = "measured",
): string {
  const detail = segment.note ?? formatLogCount(segment.logCount);
  return `${formatInterval(segment)}. ${describeState(segment, mode)}. ${detail}.`;
}
