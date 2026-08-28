import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewSection } from "@/app/dev/ribbon/preview-section";
import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { FaultCard } from "@/components/faults/fault-card";
import { FaultMapPanel } from "@/components/faults/fault-map-panel";
import { FaultStatusPill } from "@/components/faults/fault-status-pill";
import { FaultTypeIcon } from "@/components/faults/fault-type-icon";
import { ReportForm } from "@/components/faults/report-form";
import { SeverityBadge } from "@/components/faults/severity-badge";
import { StatusTimeline } from "@/components/faults/status-timeline";
import { FAULT_STATUS_META, FAULT_TYPE_META } from "@/components/faults/fault-types";
import {
  ALL_SEVERITIES,
  ALL_STATUSES,
  ALL_TYPES,
  MOCK_FAULTS,
  mockFault,
} from "@/components/faults/mock-faults";
import { outageWindowSegments } from "@/components/faults/outage-window-segments";

export const metadata: Metadata = {
  title: "Faults — component preview",
  robots: { index: false, follow: false },
};

const fragment = outageWindowSegments({
  from: new Date("2026-08-27T09:38:00+01:00"),
  to: new Date("2026-08-27T14:25:00+01:00"),
  logs: [
    { loggedAt: new Date("2026-08-27T09:38:00+01:00"), status: "off" },
    { loggedAt: new Date("2026-08-27T13:12:00+01:00"), status: "on" },
    { loggedAt: new Date("2026-08-27T13:40:00+01:00"), status: "off" },
  ],
  statusBefore: "on",
});

export default function FaultsPreviewPage() {
  // Component scaffolding — not part of the shipped app.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-12 uppercase tracking-widest text-text-muted">
          Component preview
        </p>
        <h1 className="font-display text-32 font-medium text-text">Faults</h1>
        <p className="max-w-prose text-14 text-text-muted">
          M5 fault surfaces in isolation. Cards here suppress the outage-window
          ribbon (it fetches per area); the fragment gets its own section below
          with fixed data.
        </p>
      </header>

      <PreviewSection
        title="Fault-type icons"
        note="Electrical concepts use the custom 1.5px icons from M4; the rest fall back to Lucide at the same weight."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ALL_TYPES.map((type) => (
            <li key={type} className="flex flex-col items-center gap-1.5 text-center">
              <FaultTypeIcon type={type} size={24} className="text-text" />
              <span className="text-12 text-text-muted">{FAULT_TYPE_META[type].label}</span>
            </li>
          ))}
        </ul>
      </PreviewSection>

      <PreviewSection
        title="Severity"
        note="A word and a 4-tick meter — never colour alone. Low is muted, medium warn, high and critical fault-red, critical filled solid."
      >
        <div className="flex flex-wrap gap-4">
          {ALL_SEVERITIES.map((severity) => (
            <SeverityBadge key={severity} severity={severity} />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Status"
        note="Mono face, a dot, a word. Fault-red only at the two alarm edges — Reported and Rejected."
      >
        <div className="flex flex-col gap-2">
          {ALL_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-3">
              <FaultStatusPill status={status} />
              <span className="text-12 text-text-muted">{FAULT_STATUS_META[status].blurb}</span>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Outage-window fragment"
        note="A short supply ribbon covering a fault's window — reported_at to now, or to resolved_at."
      >
        <SupplyRibbon
          segments={fragment}
          label="Power during this fault"
          height={22}
          gapColor="var(--color-surface)"
        />
      </PreviewSection>

      <PreviewSection
        title="Fault card"
        note="The whole card is a link to the detail page."
      >
        <div className="flex flex-col gap-3">
          {MOCK_FAULTS.map((fault) => (
            <FaultCard key={fault.id} fault={fault} showRibbon={false} />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Map"
        note="Vanilla Leaflet, severity-coloured divIcon pins, OSM tiles. Faults without a GPS pin fall to the caption."
      >
        <FaultMapPanel faults={MOCK_FAULTS} />
      </PreviewSection>

      <PreviewSection title="Status timeline" note="Derived from the fields the schema carries today.">
        <div className="flex flex-col gap-6">
          <StatusTimeline fault={mockFault({ status: "in_progress", confirm_count: 6 })} />
          <StatusTimeline
            fault={mockFault({
              status: "resolved",
              confirm_count: 8,
              resolved_at: new Date("2026-08-26T20:00:00+01:00").toISOString(),
              resolution_note: "Transformer replaced.",
            })}
          />
        </div>
      </PreviewSection>

      <PreviewSection title="Report form" note="The real form — it reads your saved area and will submit.">
        <ReportForm />
      </PreviewSection>
    </main>
  );
}
