import { Info } from "lucide-react";
import { UptimeBar } from "./uptime-bar";

/**
 * One LGA line — a name, its uptime as a figure and a bar, and (when
 * coverage is thin) the note saying so. Shared by the state comparison and
 * the national ranking so the two read identically.
 */
type LgaRowProps = {
  name: string;
  /** State name, shown under the LGA in the national list. */
  sublabel?: string;
  percent: number;
  logCount: number;
  contributorCount: number;
  /** Whether the row cleared the confidence bar. */
  ranked: boolean;
  /** The signed-in user's own LGA. */
  isMine?: boolean;
  /** Position in the national ranking, if this row carries one. */
  rank?: number | null;
};

function count(value: number, singular: string): string {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

export function LgaRow({
  name,
  sublabel,
  percent,
  logCount,
  contributorCount,
  ranked,
  isMine = false,
  rank,
}: LgaRowProps) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2 truncate">
          {rank != null && (
            <span className="font-mono text-12 text-text-muted tabular-nums">{rank}</span>
          )}
          <span className={`truncate text-14 ${isMine ? "font-medium text-text" : "text-text"}`}>
            {name}
          </span>
          {sublabel && <span className="truncate text-12 text-text-muted">{sublabel}</span>}
          {isMine && (
            <span className="shrink-0 rounded bg-hairline px-1.5 py-0.5 text-12 text-text">
              You
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-14 text-text tabular-nums">
          {percent.toFixed(1)}%
        </span>
      </div>

      <UptimeBar percent={percent} muted={!ranked} />

      {!ranked && (
        <p className="flex items-center gap-1.5 text-12 text-warn">
          <Info aria-hidden="true" size={13} strokeWidth={1.5} className="shrink-0" />
          Based on {count(logCount, "log")} from {count(contributorCount, "contributor")}.
        </p>
      )}
    </li>
  );
}
