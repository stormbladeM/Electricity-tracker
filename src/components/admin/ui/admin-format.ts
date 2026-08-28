/**
 * Timestamps for admin tables.
 *
 * The user app phrases time relatively ("3 hours ago") because that is what a
 * person cares about mid-outage. Moderation is the opposite: deciding whether
 * two logs are three minutes apart needs the actual clock, in the data face,
 * lining up down the column.
 */

/** "27 Aug, 12:38" — the table form. */
export function formatStamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "27 Aug 2026, 12:38:04" — the title attribute behind the short form. */
export function formatExactStamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** "3f8a…" — enough of an anonymous account id to tell two rows apart. */
export function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

/** What to call an account with no display name — most of them, anonymously. */
export function accountLabel(displayName: string | null, id: string): string {
  return displayName?.trim() ? displayName : shortId(id);
}
