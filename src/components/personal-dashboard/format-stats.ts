/**
 * Number formatting for the stat tiles.
 *
 * Two forms of every duration: a compact one for the tile, which has to stay
 * readable at 320px, and the spelled-out one from the status card for screen
 * readers and hints, which is the wording CLAUDE.md's duration copy uses.
 */
import { formatWords } from "@/components/status-card/format-duration";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** "92.4" — one decimal, because a whole-number uptime hides a lot of minutes. */
export function formatUptime(percent: number): string {
  return percent.toFixed(1);
}

/** "2d 3h" / "4h 17m" / "47m" — the tile form. */
export function formatCompactDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < MINUTES_PER_HOUR) return `${total}m`;

  if (total < MINUTES_PER_DAY) {
    const hours = Math.floor(total / MINUTES_PER_HOUR);
    const rest = total % MINUTES_PER_HOUR;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }

  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.round((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

/** "4 hours 17 minutes" — the spoken form, shared with the status card. */
export function formatSpokenDuration(minutes: number): string {
  return formatWords(Math.max(0, minutes) * 60_000);
}
