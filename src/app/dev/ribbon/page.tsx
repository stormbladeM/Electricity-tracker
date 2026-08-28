import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MOCK_NOW,
  mockAreaComparison,
  mockMonth,
  mockOutageWindow,
  mockToday,
  mockWeek,
} from "@/components/supply-ribbon/mock-data";
import { formatDate } from "@/components/supply-ribbon/format";
import { RibbonLegend } from "@/components/supply-ribbon/ribbon-legend";
import { RibbonRow } from "@/components/supply-ribbon/ribbon-row";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import { PreviewSection } from "./preview-section";
import { RestorationDemo } from "./restoration-demo";

export const metadata: Metadata = {
  title: "Supply ribbon — component preview",
  robots: { index: false, follow: false },
};

/** Gaps show the card behind the ribbon, so they match the card's surface. */
const GAP = "var(--color-surface)";

export default function SupplyRibbonPreviewPage() {
  // Component scaffolding — not part of the shipped app.
  if (process.env.NODE_ENV === "production") notFound();

  const today = mockToday();
  const week = mockWeek();
  const month = mockMonth();
  const comparison = mockAreaComparison();
  const outageWindow = mockOutageWindow();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-12 uppercase tracking-widest text-text-muted">
          Component preview
        </p>
        <h1 className="font-display text-32 font-medium text-text">Supply ribbon</h1>
        <p className="max-w-prose text-14 text-text-muted">
          Every variant below is the same component with different segments. The
          data is generated and fixed at {formatDate(MOCK_NOW)}, 14:37 — nothing
          here talks to Supabase yet.
        </p>
      </header>

      <PreviewSection
        title="Segment states"
        note="Off is dark, never red. The two hatches say “we can’t tell you”, in opposite directions so they never read as a colour difference alone."
      >
        <RibbonLegend />
      </PreviewSection>

      <PreviewSection
        title="Today"
        note="One ribbon, 24 hourly segments. Hours after 14:37 are unknown, and the 14:00 segment is part known, part unknown. Hover, tap or tab into a segment for its interval and log count; arrow keys move along the strip."
      >
        <SupplyRibbon
          segments={today}
          label="Power in Akure South today"
          height={32}
          gapColor={GAP}
        />
        <div className="mt-2 flex justify-between font-mono text-12 text-text-muted">
          <span>00:00</span>
          <span>12:00</span>
          <span>24:00</span>
        </div>
      </PreviewSection>

      <PreviewSection
        title="This week"
        note="Seven stacked ribbons — a column of rows, not a second component."
      >
        <div className="flex flex-col gap-1.5">
          {week.map((row) => (
            <RibbonRow
              key={row.key}
              rowLabel={row.label}
              segments={row.segments}
              label={`Power in Akure South on ${row.label}`}
              height={20}
              gapColor={GAP}
              labelWidth="3.5rem"
            />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Last 30 days"
        note="The same rows packed down to 10px — the barcode. The oldest days are sparsely covered, so they hatch."
      >
        <div className="flex flex-col gap-1">
          {month.map((row) => (
            <RibbonRow
              key={row.key}
              rowLabel={row.label}
              segments={row.segments}
              label={`Power in Akure South on ${row.label}`}
              height={10}
              gap={1}
              gapColor={GAP}
              labelWidth="3.5rem"
            />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="LGA comparison"
        note="One ribbon per area for the same day, stacked and labelled."
      >
        <div className="flex flex-col gap-2">
          {comparison.map((row) => (
            <RibbonRow
              key={row.key}
              rowLabel={row.label}
              segments={row.segments}
              label={`Power in ${row.label} yesterday`}
              height={22}
              gapColor={GAP}
              labelWidth="6.5rem"
            />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Fault card fragment"
        note="Six segments instead of 24 — a fragment is just a shorter ribbon."
      >
        <article className="flex flex-col gap-3 rounded border border-hairline bg-base p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-16 font-medium text-text">
              Transformer fault, Oba-Ile
            </h3>
            <span className="font-mono text-12 text-fault">Unresolved</span>
          </div>
          <SupplyRibbon
            segments={outageWindow}
            label="Outage window for the Oba-Ile transformer fault"
            height={26}
            gapColor="var(--color-base)"
          />
          <p className="text-14 text-text-muted">
            Power was out from 16:38 to 21:25. Based on 20 logs from 6 contributors.
          </p>
        </article>
      </PreviewSection>

      <PreviewSection
        title="Power restoration"
        note="The one orchestrated motion moment: 400ms, overshooting past --on toward near-white for ~80ms, then settling. Instant fill instead when the viewer prefers reduced motion."
      >
        <RestorationDemo />
      </PreviewSection>

      <PreviewSection
        title="Loading"
        note="Skeleton ribbons in --surface, never a spinner."
      >
        <div className="flex flex-col gap-1.5 rounded border border-hairline bg-base p-4">
          {[32, 20, 20].map((height, index) => (
            <SupplyRibbonSkeleton
              key={index}
              height={height}
              gapColor="var(--color-base)"
            />
          ))}
        </div>
      </PreviewSection>
    </main>
  );
}
