/**
 * "just now" / "12 minutes ago" / "3 hours ago" / "2 days ago" / "5 Aug" —
 * a short past-tense relative timestamp for feed items and fault cards.
 *
 * The dashboards phrase elapsed time as durations (format-duration.ts); this is
 * the "when did it happen" phrasing a feed needs instead. Anything older than a
 * week falls back to an absolute day so a stale report doesn't read as "9 days
 * ago" forever.
 */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(from: Date | string, now: Date = new Date()): string {
  const then = typeof from === "string" ? new Date(from) : from;
  const elapsed = now.getTime() - then.getTime();

  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) {
    const minutes = Math.floor(elapsed / MINUTE_MS);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (elapsed < 7 * DAY_MS) {
    const days = Math.floor(elapsed / DAY_MS);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
