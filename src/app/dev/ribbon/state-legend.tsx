import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { flatSegment } from "@/components/supply-ribbon/segment";
import type { SegmentState } from "@/components/supply-ribbon/types";

const SAMPLE_START = new Date(2026, 7, 26, 9);
const SAMPLE_END = new Date(2026, 7, 26, 10);

const STATES: { state: SegmentState; label: string; meaning: string }[] = [
  { state: "on", label: "On", meaning: "Power was on" },
  { state: "off", label: "Off", meaning: "Power was out" },
  { state: "no-data", label: "No data", meaning: "A past hour nobody logged" },
  { state: "unknown", label: "Unknown", meaning: "Still in the future" },
];

/** The four segment states side by side, each drawn by the ribbon itself. */
export function StateLegend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3">
      {STATES.map(({ state, label, meaning }) => (
        <li key={state} className="flex items-center gap-2">
          <span className="w-8 shrink-0">
            <SupplyRibbon
              segments={[
                flatSegment(
                  SAMPLE_START,
                  SAMPLE_END,
                  state,
                  state === "on" || state === "off" ? 3 : 0,
                ),
              ]}
              label={`${label} sample segment`}
              height={16}
              gap={0}
              gapColor="var(--color-surface)"
            />
          </span>
          <span className="text-12 text-text">{label}</span>
          <span className="text-12 text-text-muted">{meaning}</span>
        </li>
      ))}
    </ul>
  );
}
