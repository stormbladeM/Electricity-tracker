"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  detectAnomalies,
  SEVERITY_LABEL,
  type Anomaly,
} from "@/components/forecast/anomaly";
import {
  SHIFT_BASELINE_DAYS,
  SHIFT_RECENT_DAYS,
  useUptimeShift,
} from "@/components/forecast/use-uptime-shift";
import { AdminEmpty, AdminTable, AdminTableSkeleton, Td, Th, Tr } from "../ui/admin-table";
import { ExportButton } from "../ui/export-button";

/**
 * The admin half of M7's anomaly alerts: every LGA whose supply has shifted
 * against its own recent normal, worst drop first.
 *
 * Deliberately a change list and not a league table. The coverage dashboard
 * already says which areas report enough to be trusted and the area ranking
 * says which are worst off; neither of those changes week to week, so neither
 * tells an admin where to look *today*. This does.
 *
 * Classification is shared with the contributor-facing banner
 * (src/components/forecast/anomaly.ts), so an area flagged here is flagged
 * there too. An admin who is told about a drop the public page is quietly
 * hiding — or the reverse — has an interface that cannot be trusted about
 * anything else either.
 *
 * No colour coding of severity. `--fault` belongs to faults and `--warn` to
 * degraded data; a supply shift is neither, so the severity is a word and the
 * direction is an arrow, exactly as MetricTile handles growth deltas.
 */
const EXPORT_COLUMNS = [
  "state",
  "lga",
  "severity",
  "direction",
  "recent_uptime_percent",
  "baseline_uptime_percent",
  "delta_percent",
  "recent_logs",
  "baseline_logs",
  "recent_contributors",
  "recent_outages",
] as const;

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

function signedPoints(delta: number): string {
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export function AnomalyPanel() {
  const { rows, isLoading, error, refetch } = useUptimeShift();

  const anomalies = useMemo(() => detectAnomalies(rows ?? []), [rows]);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-12 font-medium uppercase tracking-wide text-text-muted">
            Changed sharply
          </h2>
          <p className="mt-1 text-12 text-text-muted">
            Uptime over the last {SHIFT_RECENT_DAYS} days against each LGA&apos;s own{" "}
            {SHIFT_BASELINE_DAYS} days before that.
          </p>
        </div>

        <ExportButton
          stem="uptime-shifts"
          columns={EXPORT_COLUMNS}
          disabled={anomalies.length === 0}
          rows={() =>
            anomalies.map((anomaly) => [
              anomaly.row.state_name,
              anomaly.row.lga_name,
              SEVERITY_LABEL[anomaly.severity],
              anomaly.direction,
              anomaly.row.recent_uptime_percent,
              anomaly.row.baseline_uptime_percent,
              anomaly.row.delta_percent,
              anomaly.row.recent_log_count,
              anomaly.row.baseline_log_count,
              anomaly.row.recent_contributor_count,
              anomaly.row.recent_outage_count,
            ])
          }
        />
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
          <p className="text-14 text-fault">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded border border-hairline px-3 py-2 text-14 text-text hover:border-text-muted"
          >
            Try again
          </button>
        </div>
      ) : isLoading || !rows ? (
        <AdminTableSkeleton rows={4} />
      ) : anomalies.length === 0 ? (
        <AdminEmpty
          message="No LGA has shifted sharply against its own baseline."
          hint={`Areas need reports in both windows before a change can be measured. ${
            rows.length
          } ${rows.length === 1 ? "LGA has" : "LGAs have"} enough history to compare.`}
        />
      ) : (
        <AdminTable
          caption="LGAs whose uptime has shifted sharply against their own recent baseline"
          head={
            <>
              <Th>Area</Th>
              <Th>Change</Th>
              <Th className="text-right">Recent</Th>
              <Th className="text-right">Baseline</Th>
              <Th className="text-right">Logs</Th>
              <Th>Reads as</Th>
            </>
          }
        >
          {anomalies.map((anomaly) => (
            <AnomalyRow key={anomaly.row.lga_id} anomaly={anomaly} />
          ))}
        </AdminTable>
      )}
    </section>
  );
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  const { row } = anomaly;
  const href =
    row.state_slug && row.lga_slug
      ? `/state/${row.state_slug}/lga/${row.lga_slug}`
      : null;

  return (
    <Tr>
      <Td>
        {href ? (
          <Link href={href} className="rounded text-primary-text hover:underline">
            {row.lga_name}
          </Link>
        ) : (
          row.lga_name
        )}
        <span className="block text-12 text-text-muted">{row.state_name}</span>
      </Td>
      <Td className="font-mono whitespace-nowrap">
        <span aria-hidden="true">{anomaly.direction === "drop" ? "↓ " : "↑ "}</span>
        {signedPoints(row.delta_percent)} points
      </Td>
      <Td className="text-right font-mono">{percent(row.recent_uptime_percent)}</Td>
      <Td className="text-right font-mono">{percent(row.baseline_uptime_percent)}</Td>
      <Td className="text-right font-mono">
        {row.recent_log_count}
        <span className="block text-12 text-text-muted">
          {row.recent_contributor_count}{" "}
          {row.recent_contributor_count === 1 ? "person" : "people"}
        </span>
      </Td>
      <Td className="whitespace-nowrap text-text-muted">
        {SEVERITY_LABEL[anomaly.severity]}
      </Td>
    </Tr>
  );
}
