/**
 * Grid events inferred from synchronized logs — the reading and grading half.
 *
 * The detector (migration 0015) decides an event is real from its structure:
 * at least three distinct contributors, at least 70% agreeing on one status,
 * inside a cluster no wider than 30 minutes that beats the area's ordinary
 * reporting rate. It stores the raw evidence and stops there.
 *
 * How confident to *sound* about an event is a separate judgement, and it has
 * to read the same on the area dashboard and anywhere else the event is shown
 * — the same reason anomaly.ts keeps the anomaly thresholds in one TypeScript
 * module rather than hard-coded into the SQL.
 *
 * Pure and framework-free so it stays testable and reusable.
 */

export type GridEventType = "restoration" | "outage";
export type GridEventConfidence = "low" | "medium" | "high";

/** One `grid_events` row, numbers already coerced from PostgREST. */
export type GridEventRow = {
  id: string;
  areaId: string;
  eventType: GridEventType;
  /** Earliest contributing log — roughly when the grid flipped. */
  occurredAt: Date;
  /** Spread from the first contributing log to the last, in seconds. */
  windowSeconds: number;
  distinctContributors: number;
  contributingLogs: number;
  /** Share of the cluster's logs that agree on the dominant status, 0–1. */
  agreement: number;
};

const MINUTE_S = 60;

/**
 * How loudly to state an event.
 *
 *   high   — enough people, tight enough, agreeing strongly enough that this
 *            was not one street or one coincidence.
 *   medium — corroborated, but over a looser window or with a dissenting report.
 *   low    — sitting at the detector's floor: real enough to record, too thin
 *            to lead a dashboard with.
 */
export function gradeGridEvent(row: GridEventRow): GridEventConfidence {
  const tight = row.windowSeconds <= 10 * MINUTE_S;
  const loose = row.windowSeconds <= 20 * MINUTE_S;

  if (row.distinctContributors >= 5 && row.agreement >= 0.85 && tight) return "high";
  if (row.distinctContributors >= 4 && row.agreement >= 0.75 && loose) return "medium";
  return "low";
}

export const CONFIDENCE_LABEL: Record<GridEventConfidence, string> = {
  low: "Likely",
  medium: "Probable",
  high: "Confirmed by several reports",
};

/** True when the event is solid enough to surface as a banner (grade above low). */
export function isNoteworthy(row: GridEventRow): boolean {
  return gradeGridEvent(row) !== "low";
}

/** "9:34 pm", or "Fri, 9:34 pm" when the event was not today. */
function whenPhrase(date: Date, now: Date = new Date()): string {
  const time = date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s?([AP]M)$/i, (_, meridiem: string) => ` ${meridiem.toLowerCase()}`);

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return time;

  return `${date.toLocaleDateString(undefined, { weekday: "short" })}, ${time}`;
}

function spread(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/** "Grid restored in Akure South around 9:34 pm." */
export function gridEventHeadline(row: GridEventRow, areaName: string, now?: Date): string {
  return row.eventType === "restoration"
    ? `Grid restored in ${areaName} around ${whenPhrase(row.occurredAt, now)}.`
    : `Area-wide outage in ${areaName} from around ${whenPhrase(row.occurredAt, now)}.`;
}

/** "9 contributors reported power on within 6 minutes." */
export function gridEventDetail(row: GridEventRow): string {
  const who = `${row.distinctContributors} ${
    row.distinctContributors === 1 ? "contributor" : "contributors"
  }`;
  const what = row.eventType === "restoration" ? "power on" : "the outage";
  return `${who} reported ${what} within ${spread(row.windowSeconds)}.`;
}
