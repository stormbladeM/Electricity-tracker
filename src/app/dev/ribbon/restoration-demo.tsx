"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { mockRestorationDay } from "@/components/supply-ribbon/mock-data";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";

/**
 * Fires the one motion moment in the product. The day is fixed at 15:00 with
 * an outage running since 09:12; restoring it lights the 14:00 segment from
 * :15 onward, and that segment surges.
 */
export function RestorationDemo() {
  const [restored, setRestored] = useState(false);
  const segments = useMemo(() => mockRestorationDay(restored), [restored]);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <SupplyRibbon
        segments={segments}
        label="Power in Akure South today, restoration demo"
        height={32}
        gapColor="var(--color-surface)"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRestored((current) => !current)}
          className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          {restored ? "Power is off again" : "Power is back on"}
        </button>
        <p className="text-14 text-text-muted">
          {restored
            ? "Power came back at 14:15."
            : "Off since 09:12. Restoring lights the 14:00 segment."}
        </p>
      </div>

      <p className="font-mono text-12 text-text-muted">
        prefers-reduced-motion: {prefersReducedMotion ? "reduce — instant fill" : "no preference — surge plays"}
      </p>
    </div>
  );
}
