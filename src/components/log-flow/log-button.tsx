"use client";

import type { Enums } from "@/lib/supabase/database.types";

type PowerStatus = Enums<"power_status">;

type LogButtonProps = {
  /** The area's current status, or null when there's no log yet. */
  currentStatus: PowerStatus | null;
  isSubmitting: boolean;
  onLog: (status: PowerStatus) => void;
};

/**
 * The primary log control.
 *
 * With a known current status it's a single toggle labelled with the state
 * that will be true AFTER tapping, per CLAUDE.md's copy rule — never the
 * state being reported. With no logs yet there's nothing to toggle from, so
 * it asks plainly instead of assuming a starting state.
 */
export function LogButton({ currentStatus, isSubmitting, onLog }: LogButtonProps) {
  if (currentStatus === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-14 text-text-muted">No logs yet here. What&apos;s the status right now?</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onLog("on")}
            className="flex-1 rounded bg-primary px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
          >
            Power is on
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onLog("off")}
            className="flex-1 rounded border border-hairline bg-surface px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
          >
            Power is off
          </button>
        </div>
      </div>
    );
  }

  const nextStatus: PowerStatus = currentStatus === "off" ? "on" : "off";
  const label = currentStatus === "off" ? "Power is back on" : "Power just went off";

  return (
    <button
      type="button"
      onClick={() => onLog(nextStatus)}
      disabled={isSubmitting}
      className="w-full rounded bg-primary px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
    >
      {isSubmitting ? "Saving…" : label}
    </button>
  );
}
