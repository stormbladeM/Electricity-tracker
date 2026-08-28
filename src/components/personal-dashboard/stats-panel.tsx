import { ConfidenceNote } from "./confidence-note";
import { EmptyWindow } from "./empty-window";
import {
  formatCompactDuration,
  formatSpokenDuration,
  formatUptime,
} from "./format-stats";
import { PERIOD_PHRASES, type Period } from "./period";
import { StatTile, StatTileSkeleton } from "./stat-tile";
import type { Coverage } from "./confidence";
import type { LongestOutage, OutageStats } from "./outage-stats";

/**
 * The three headline numbers for the window: uptime, longest outage, outage
 * count — with the coverage note underneath saying how much evidence they rest
 * on.
 *
 * The note is part of the reading, not a footnote to it. A 98% uptime from
 * four logs and a 98% uptime from four hundred are different claims, and the
 * only place that difference shows up is this line.
 */
type StatsPanelProps = {
  stats: OutageStats | null;
  coverage: Coverage | null;
  period: Period;
  areaName: string;
  isLoading: boolean;
  error: string | null;
};

/** "Started before this window. Still off." — only what actually applies. */
function longestOutageHint(longest: LongestOutage): string | undefined {
  const parts: string[] = [];
  if (longest.startedBeforeWindow) parts.push("Started before this window.");
  if (longest.isOngoing) parts.push("Still off.");
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function uptimeHint(offMinutes: number, period: Period): string {
  const phrase = PERIOD_PHRASES[period];
  if (offMinutes < 1) return `No outages logged ${phrase}.`;
  return `Off for ${formatSpokenDuration(offMinutes)} ${phrase}.`;
}

export function StatsPanel({
  stats,
  coverage,
  period,
  areaName,
  isLoading,
  error,
}: StatsPanelProps) {
  if (error) {
    return <p className="text-14 text-fault">{error}</p>;
  }

  if (isLoading || !stats || !coverage) {
    return (
      <div className="flex flex-col gap-3">
        <StatTileSkeleton emphasis="hero" />
        <div className="grid grid-cols-2 gap-3">
          <StatTileSkeleton />
          <StatTileSkeleton />
        </div>
      </div>
    );
  }

  if (!coverage.hasAnyKnowledge) {
    return <EmptyWindow areaName={areaName} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <StatTile
        emphasis="hero"
        label={`Uptime ${PERIOD_PHRASES[period]}`}
        value={formatUptime(stats.uptimePercent)}
        unit="%"
        hint={uptimeHint(stats.offMinutes, period)}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Longest outage"
          value={stats.longest ? formatCompactDuration(stats.longest.minutes) : "—"}
          spoken={stats.longest ? formatSpokenDuration(stats.longest.minutes) : undefined}
          hint={stats.longest ? longestOutageHint(stats.longest) : "None logged."}
        />
        <StatTile label="Outages" value={String(stats.outageCount)} />
      </div>

      <ConfidenceNote coverage={coverage} />

      {/*
        The intervals these numbers read from are rebuilt on a five-minute
        schedule, so a log made a moment ago may not have moved them yet. Say
        so plainly rather than letting it read as a bug.
      */}
      <p className="text-12 text-text-muted">
        Outage history rebuilds a few minutes after each log.
      </p>
    </div>
  );
}
