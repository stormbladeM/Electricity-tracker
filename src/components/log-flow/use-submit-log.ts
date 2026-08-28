"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLogQueue, type QueuedLog } from "@/lib/offline/log-queue";
import type { Enums } from "@/lib/supabase/database.types";

type PowerStatus = Enums<"power_status">;
type PowerSource = Enums<"power_source">;

type SubmitLogArgs = {
  userId: string;
  areaId: string;
  lgaId: string;
  stateId: string;
  status: PowerStatus;
  powerSource: PowerSource | null;
  /** This user's own most recent logged status for the area, for the duplicate guard below. */
  latestStatus: PowerStatus | null;
};

type SubmitResult =
  | { ok: true; queued: boolean }
  | { ok: false; reason: "duplicate" | "error"; message: string };

/**
 * A Postgrest error with no `code` is a fetch that never reached the server
 * (offline, DNS, CORS pre-flight) — worth queueing and retrying. A code like
 * `23514` or `42501` is the database rejecting the row on its merits, which no
 * amount of retrying will fix.
 */
function isTransient(error: { code?: string; message?: string }): boolean {
  if (!error.code) return true;
  return /fetch|network|timeout/i.test(error.message ?? "");
}

/**
 * The log insert, plus the application-layer duplicate guard the schema
 * deliberately leaves to us (power_logs migration comment: nothing at the
 * database level stops two consecutive same-status logs — that's M2's job).
 * The guard is per-user, not per-area — a second person confirming the same
 * status is valid corroborating data, not a duplicate.
 *
 * When the insert can't reach Supabase (offline, or a transient failure) the
 * log goes to the offline queue instead of being lost, and the result comes
 * back `{ ok: true, queued: true }`. See lib/offline/log-queue.tsx.
 *
 * Doesn't fetch the latest status itself — the caller already holds it from
 * useMyLatestStatus, so this stays a pure mutation with no read of its own.
 */
export function useSubmitLog() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pending, enqueue, flush } = useLogQueue();

  const submit = useCallback(
    async (args: SubmitLogArgs): Promise<SubmitResult> => {
      // The duplicate guard compares against this user's last known status for
      // the area — whichever is later, the server value the caller passed or a
      // log of theirs still waiting in the offline queue.
      const queuedStatus = pending
        .filter((log) => log.areaId === args.areaId && log.userId === args.userId)
        .at(-1)?.status;
      const effectiveLatest = queuedStatus ?? args.latestStatus;

      if (effectiveLatest === args.status) {
        return {
          ok: false,
          reason: "duplicate",
          message: `You already logged power as ${args.status} here. No need to log it again.`,
        };
      }

      const loggedAt = new Date().toISOString();
      const queued: Omit<QueuedLog, "id"> = {
        userId: args.userId,
        areaId: args.areaId,
        lgaId: args.lgaId,
        stateId: args.stateId,
        status: args.status,
        powerSource: args.powerSource,
        loggedAt,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue(queued);
        return { ok: true, queued: true };
      }

      setIsSubmitting(true);
      const supabase = createClient();
      const { error } = await supabase.from("power_logs").insert({
        user_id: args.userId,
        area_id: args.areaId,
        lga_id: args.lgaId,
        state_id: args.stateId,
        status: args.status,
        power_source: args.powerSource,
        logged_at: loggedAt,
      });
      setIsSubmitting(false);

      if (error) {
        if (isTransient(error)) {
          enqueue(queued);
          return { ok: true, queued: true };
        }
        return {
          ok: false,
          reason: "error",
          message: "Couldn't save that log. Check your connection and try again.",
        };
      }

      // A live insert is a good moment to drain anything left in the queue.
      void flush();
      return { ok: true, queued: false };
    },
    [pending, enqueue, flush],
  );

  return { submit, isSubmitting };
}
