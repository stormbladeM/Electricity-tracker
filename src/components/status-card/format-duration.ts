const MINUTE_MS = 60_000;

/** "04:17" — hours:minutes for the DSEG7 meter readout. */
export function formatMeter(elapsedMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(elapsedMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "4 hours 17 minutes" — the words CLAUDE.md's duration copy uses. */
export function formatWords(elapsedMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(elapsedMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes <= 1 ? "less than a minute" : `${minutes} minutes`;
  }

  const hourWord = hours === 1 ? "hour" : "hours";
  if (minutes === 0) return `${hours} ${hourWord}`;
  const minuteWord = minutes === 1 ? "minute" : "minutes";
  return `${hours} ${hourWord} ${minutes} ${minuteWord}`;
}
