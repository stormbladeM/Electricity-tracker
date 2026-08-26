"use client";

import type { PowerLog } from "@/lib/hooks/use-latest-log";
import { formatMeter, formatWords } from "./format-duration";
import { useStatusDuration } from "./use-status-duration";

type StatusCardProps = {
  latestLog: PowerLog | null;
  lgaName: string | null;
  isLoading: boolean;
};

/**
 * The signed-in user's current area status, per CLAUDE.md's exact copy
 * pattern. The DSEG7 meter face is used only for the live duration readout
 * below the headline — nowhere else in the product.
 */
export function StatusCard({ latestLog, lgaName, isLoading }: StatusCardProps) {
  const elapsedMs = useStatusDuration(latestLog?.logged_at ?? null);
  const area = lgaName ?? "your area";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading status">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
        <div className="h-6 w-24 animate-pulse rounded bg-surface" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  if (!latestLog) {
    return <p className="text-16 text-text">No logs yet in {area}. Be the first to report.</p>;
  }

  const isOn = latestLog.status === "on";
  const statusWord = isOn ? "on" : "off";
  const stateLabel = isOn ? "On" : "Off";

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-32 font-medium text-text">
        Power is {statusWord} in {area}.
      </h1>
      <p className={`font-meter text-24 ${isOn ? "text-on" : "text-text-muted"}`}>
        {elapsedMs !== null ? formatMeter(elapsedMs) : "--:--"}
      </p>
      <p className="text-14 text-text-muted">
        {stateLabel} for {elapsedMs !== null ? formatWords(elapsedMs) : "an unknown time"}.
      </p>
    </div>
  );
}
