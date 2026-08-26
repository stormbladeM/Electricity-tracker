"use client";

import { useEffect, useRef, type RefObject } from "react";
import { dominantState, segmentKey } from "./segment";
import styles from "./supply-ribbon.module.css";
import type { RibbonSegment, SegmentState } from "./types";

/** Matches the animation duration in supply-ribbon.module.css. */
export const SURGE_MS = 400;

/**
 * Plays the restoration surge on segments that just flipped to on — the app's
 * one orchestrated motion moment (docs/design-system.md section 6).
 *
 * It only fires on a *transition*: segments already on when the ribbon mounted
 * stay quiet, otherwise every page load would flash. The class is added to the
 * lit rects directly rather than through state, so a month grid of 700
 * segments doesn't re-render to light one hour.
 */
export function useRestorationSurge(
  containerRef: RefObject<SVGSVGElement | null>,
  segments: RibbonSegment[],
  enabled: boolean,
): void {
  const previousStates = useRef<Map<string, SegmentState> | null>(null);

  useEffect(() => {
    const nextStates = new Map<string, SegmentState>();
    const restoredKeys: string[] = [];

    for (const segment of segments) {
      const key = segmentKey(segment);
      const state = dominantState(segment);
      nextStates.set(key, state);

      const previous = previousStates.current?.get(key);
      if (enabled && previous !== undefined && previous !== "on" && state === "on") {
        restoredKeys.push(key);
      }
    }

    previousStates.current = nextStates;

    const container = containerRef.current;
    if (!container || restoredKeys.length === 0) return;

    const surging = restoredKeys.flatMap((key) =>
      Array.from(
        container.querySelectorAll(
          `[data-segment-key="${key}"] [data-slice-state="on"]`,
        ),
      ),
    );
    for (const rect of surging) rect.classList.add(styles.surge);

    const clear = () => {
      for (const rect of surging) rect.classList.remove(styles.surge);
    };
    const timer = setTimeout(clear, SURGE_MS);
    return () => {
      clearTimeout(timer);
      clear();
    };
  }, [containerRef, segments, enabled]);
}
