"use client";

import { useMemo } from "react";
import { MeterIcon } from "@/components/icons";
import {
  CONFIDENCE_LABEL,
  gradeGridEvent,
  gridEventDetail,
  gridEventHeadline,
  isNoteworthy,
  type GridEventRow,
} from "./grid-event";
import { useGridEvents } from "./use-grid-events";

/**
 * "Grid restored in Akure South around 18:04 — 9 contributors reported power
 * on within 6 minutes."
 *
 * The one thing on the area dashboard that describes a specific moment rather
 * than a trend, so it sits with the anomaly banner, above the history. It
 * shows the most recent event that clears the "noteworthy" bar (grade above
 * low) and nothing otherwise — while loading, on error, or when there is no
 * solid event. A panel that says "we're not sure" is worse than no panel.
 *
 * No colour coding: restoration and outage read apart through the wording and
 * the meter icon, not hue (CLAUDE.md — never meaning in colour alone). --on is
 * reserved for live status, not a report about the past.
 */
export function GridEventNote({
  areaIds,
  areaName,
}: {
  areaIds: string[];
  areaName: string;
}) {
  const { rows, isLoading, error } = useGridEvents(areaIds);

  const event = useMemo<GridEventRow | null>(
    () => rows?.find(isNoteworthy) ?? null,
    [rows],
  );

  if (isLoading || error || !event) return null;

  const grade = gradeGridEvent(event);

  return (
    <section
      aria-label="Recent grid event"
      className="flex gap-3 rounded border border-hairline bg-surface p-4"
    >
      <MeterIcon size={18} className="mt-0.5 shrink-0 text-text-muted" />
      <div className="flex flex-col gap-1">
        <p className="text-12 uppercase tracking-wide text-text-muted">
          {CONFIDENCE_LABEL[grade]}
        </p>
        <p className="text-16 text-text">{gridEventHeadline(event, areaName)}</p>
        <p className="text-14 text-text-muted">{gridEventDetail(event)}</p>
      </div>
    </section>
  );
}
