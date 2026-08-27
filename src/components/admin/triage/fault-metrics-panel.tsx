"use client";

import { formatCompactDuration } from "@/components/personal-dashboard/format-stats";
import {
  AdminEmpty,
  AdminTable,
  AdminTableSkeleton,
  Td,
  Th,
  Tr,
} from "../ui/admin-table";
import { adminWindowPhrase, type AdminWindow } from "../ui/admin-window";
import { useFaultMetrics, type FaultMetric } from "./use-triage-data";

/**
 * Time to resolution, by DisCo and by state.
 *
 * Median beside mean on purpose: at this volume one transformer that took
 * three weeks moves a mean a long way, and the distance between the two
 * numbers says whether a DisCo is slow or just occasionally very slow. Neither
 * is shown at all where nothing has been resolved in the window — an empty
 * cell is honest, a zero would not be.
 */
export function FaultMetricsPanel({ days }: { days: AdminWindow }) {
  const { rows, isLoading, error } = useFaultMetrics(days);

  if (error) return <p className="text-14 text-fault">{error}</p>;
  if (isLoading || !rows) return <AdminTableSkeleton rows={8} />;
  if (rows.length === 0) {
    return <AdminEmpty message="No faults have been reported yet." />;
  }

  const byDisco = rows.filter((row) => row.dimension === "disco");
  const byState = rows.filter((row) => row.dimension === "state");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-12 text-text-muted">
        Resolution times cover reports resolved in {adminWindowPhrase(days)}. Open
        counts are current. Rejected reports are left out — they were closed, not
        fixed.
      </p>

      <MetricGroup title="By DisCo" heading="DisCo" rows={byDisco} />
      <MetricGroup title="By state" heading="State" rows={byState} />
    </div>
  );
}

function MetricGroup({
  title,
  heading,
  rows,
}: {
  title: string;
  heading: string;
  rows: FaultMetric[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-12 font-medium uppercase tracking-wide text-text-muted">
        {title}
      </h2>

      {rows.length === 0 ? (
        <AdminEmpty message="Nothing to show here yet." />
      ) : (
        <AdminTable
          caption={`Fault load and time to resolution ${title.toLowerCase()}`}
          head={
            <>
              <Th>{heading}</Th>
              <Th className="text-right">Open</Th>
              <Th className="text-right">Resolved</Th>
              <Th className="text-right">Median</Th>
              <Th className="text-right">Mean</Th>
            </>
          }
        >
          {rows.map((row) => (
            <Tr key={`${row.dimension}-${row.label}`}>
              <Td className="whitespace-nowrap">{row.label}</Td>
              <Td className="text-right font-mono text-14">{row.open_count}</Td>
              <Td className="text-right font-mono text-14">{row.resolved_count}</Td>
              <Td className="text-right font-mono text-14">{hours(row.median_hours)}</Td>
              <Td className="text-right font-mono text-14">{hours(row.avg_hours)}</Td>
            </Tr>
          ))}
        </AdminTable>
      )}
    </section>
  );
}

function hours(value: number | null): string {
  return value == null ? "—" : formatCompactDuration(value * 60);
}
