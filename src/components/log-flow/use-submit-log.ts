"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  | { ok: true }
  | { ok: false; reason: "duplicate" | "error"; message: string };

/**
 * The log insert, plus the application-layer duplicate guard the schema
 * deliberately leaves to us (power_logs migration comment: nothing at the
 * database level stops two consecutive same-status logs — that's M2's job).
 * The guard is per-user, not per-area — a second person confirming the same
 * status is valid corroborating data, not a duplicate.
 *
 * Doesn't fetch the latest status itself — the caller already holds it from
 * useMyLatestStatus, so this stays a pure mutation with no read of its own.
 */
export function useSubmitLog() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (args: SubmitLogArgs): Promise<SubmitResult> => {
    if (args.latestStatus === args.status) {
      return {
        ok: false,
        reason: "duplicate",
        message: `You already logged power as ${args.status} here. No need to log it again.`,
      };
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
    });
    setIsSubmitting(false);

    if (error) {
      return {
        ok: false,
        reason: "error",
        message: "Couldn't save that log. Check your connection and try again.",
      };
    }

    return { ok: true };
  }, []);

  return { submit, isSubmitting };
}
