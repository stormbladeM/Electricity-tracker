"use client";

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { RibbonDefs, ribbonPatternIds } from "./ribbon-defs";
import { RibbonSegmentView } from "./ribbon-segment";
import { RibbonTooltip } from "./ribbon-tooltip";
import { segmentKey } from "./segment";
import { useRestorationSurge } from "./use-restoration-surge";
import type { RibbonSegment } from "./types";

export type SupplyRibbonProps = {
  /** Ordered left to right. Any length: 24 for a day, 6 for a fault fragment. */
  segments: RibbonSegment[];
  /** Accessible name for the strip, e.g. "Power in Akure South on Mon 24". */
  label: string;
  /** Strip height in px. 28 reads as a day; 10 packs into a month barcode. */
  height?: number;
  /** Gap between segments in px — constant at every width, so it never smears. */
  gap?: number;
  /** What shows through the gaps. Set it to the surface the ribbon sits on. */
  gapColor?: string;
  className?: string;
};

/**
 * The supply ribbon (docs/design-system.md section 4).
 *
 * Geometry is expressed in percentages rather than a scaled viewBox: the strip
 * fills whatever width it's given down to 320px, while gaps, hatch spacing and
 * the focus ring stay in real pixels instead of stretching with the container.
 *
 * Everything above one strip — a week, a month barcode, an LGA comparison — is
 * N of these in a column, not another component.
 */
export function SupplyRibbon({
  segments,
  label,
  height = 28,
  gap = 2,
  gapColor = "var(--color-base)",
  className,
}: SupplyRibbonProps) {
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const patterns = ribbonPatternIds(instanceId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);

  const prefersReducedMotion = useReducedMotion();
  useRestorationSurge(svgRef, segments, !prefersReducedMotion);

  if (segments.length === 0) return null;

  const cellWidth = 100 / segments.length;

  function focusSegment(index: number) {
    const clamped = Math.max(0, Math.min(segments.length - 1, index));
    setTabStop(clamped);
    svgRef.current
      ?.querySelector<SVGRectElement>(`[data-segment-index="${clamped}"]`)
      ?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>) {
    const current = Number(event.currentTarget.dataset.segmentIndex);
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: segments.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusSegment(next);
  }

  function handleFocus(event: FocusEvent<SVGSVGElement>) {
    const index = (event.target as SVGElement).dataset?.segmentIndex;
    if (index !== undefined) setTabStop(Number(index));
  }

  const activeSegment = activeIndex === null ? null : segments[activeIndex];

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg
        ref={svgRef}
        role="group"
        aria-label={label}
        width="100%"
        height={height}
        style={{ height, overflow: "visible" }}
        className="block w-full"
        onFocus={handleFocus}
      >
        <RibbonDefs ids={patterns} />

        {segments.map((segment, index) => (
          <RibbonSegmentView
            key={segmentKey(segment)}
            segment={segment}
            index={index}
            cellWidth={cellWidth}
            patterns={patterns}
            isTabStop={index === tabStop}
            onEnter={setActiveIndex}
            onLeave={(leaving) =>
              setActiveIndex((current) => (current === leaving ? null : current))
            }
            onKeyDown={handleKeyDown}
          />
        ))}

        {gap > 0 &&
          segments.slice(1).map((segment, index) => (
            <rect
              key={`gap-${segmentKey(segment)}`}
              x={`${((index + 1) * cellWidth).toFixed(4)}%`}
              y={0}
              width={gap}
              height="100%"
              transform={`translate(${-gap / 2},0)`}
              fill={gapColor}
              pointerEvents="none"
            />
          ))}
      </svg>

      {activeSegment && (
        <RibbonTooltip
          segment={activeSegment}
          centerPercent={(activeIndex! + 0.5) * cellWidth}
        />
      )}
    </div>
  );
}
