"use client";

import { useEffect, useState } from "react";

/**
 * Live elapsed time since `sinceIso`, ticking every second. Null while unset.
 *
 * Takes the timestamp as an ISO string rather than a Date so callers can pass
 * `latestLog?.logged_at` directly — a fresh `new Date(...)` on every render
 * would have a new identity each time and restart the interval needlessly.
 *
 * The first read and every tick after it run off a timer callback rather
 * than synchronously in the effect body, so the state update always happens
 * outside the effect's own render pass (react-hooks/set-state-in-effect).
 */
export function useStatusDuration(sinceIso: string | null): number | null {
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!sinceIso) {
      const clear = setTimeout(() => setElapsedMs(null), 0);
      return () => clearTimeout(clear);
    }

    const sinceMs = new Date(sinceIso).getTime();
    const tick = () => setElapsedMs(Date.now() - sinceMs);
    const kickoff = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [sinceIso]);

  return elapsedMs;
}
