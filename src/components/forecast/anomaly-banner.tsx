"use client";

import { useMemo } from "react";
import { anomalyDetail, anomalyFor, anomalyHeadline, SEVERITY_LABEL } from "./anomaly";
import { SHIFT_RECENT_DAYS, useUptimeShift } from "./use-uptime-shift";

/**
 * "Power here is down 22 points on its recent normal" — the contributor-facing
 * half of M7's anomaly alerts.
 *
 * On colour: none. `--fault` is for faults and nothing else, and a supply
 * shift is not a fault report; `--warn` marks degraded *data*, which this
 * isn't either. So the banner follows the admin MetricTile's rule and lets an
 * arrow glyph and the words carry the direction, on the ordinary surface. The
 * numbers are the alarming part; they do not need help from the palette.
 *
 * It renders nothing at all when there is no shift, while the query is in
 * flight, or when the query fails. A banner is an interruption, and an
 * interruption that says "we couldn't check" is worse than silence.
 */
export function AnomalyBanner({
  lgaId,
  areaName,
}: {
  lgaId: string | null;
  areaName?: string;
}) {
  const { rows, isLoading, error } = useUptimeShift();

  const anomaly = useMemo(() => anomalyFor(rows ?? [], lgaId), [rows, lgaId]);

  if (isLoading || error || !anomaly) return null;

  return (
    <section
      aria-label="Recent change in supply"
      className="flex gap-3 rounded border border-hairline bg-surface p-4"
    >
      <span
        aria-hidden="true"
        className="font-mono text-18 leading-6 text-text-muted"
      >
        {anomaly.direction === "drop" ? "↓" : "↑"}
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-12 uppercase tracking-wide text-text-muted">
          {SEVERITY_LABEL[anomaly.severity]}
        </p>
        <p className="text-16 text-text">{anomalyHeadline(anomaly, areaName)}</p>
        <p className="text-14 text-text-muted">
          {anomalyDetail(anomaly, SHIFT_RECENT_DAYS)}
        </p>
      </div>
    </section>
  );
}
