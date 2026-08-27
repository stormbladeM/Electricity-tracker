"use client";

import { useState } from "react";
import { GRADE_LABEL } from "@/components/area-dashboard/area-confidence";
import { formatRelativeTime } from "@/lib/time/relative-time";
import { AdminPageHeader } from "../ui/admin-page-header";
import { AdminTable, AdminTableSkeleton, Td, Th, Tr } from "../ui/admin-table";
import { MetricTile, MetricTileSkeleton } from "../ui/metric-tile";
import { WindowSelector } from "../ui/window-selector";
import { adminWindowPhrase, type AdminWindow } from "../ui/admin-window";
import { CoverageBar, CoverageLegend, GradeDot } from "./coverage-bar";
import type { StateCoverage } from "./coverage-grade";
import { useCoverage } from "./use-coverage";

/**
 * Where the data is thin — the screen that says where the next contributor is
 * worth the most.
 *
 * States are listed worst-first: fewest tracked LGAs at the top, biggest of
 * those first. That is deliberately the opposite of a leaderboard. Every other
 * aggregate in the product answers "how good is the supply here"; this one
 * answers "do we have any right to an opinion about here at all", and 763 of
 * 774 LGAs currently being silent is the honest headline of a crowdsourced
 * platform early in its life.
 *
 * On the absence of a map: the screen inventory calls this the coverage map,
 * and it isn't one. `lgas` carries no geometry or centroid — nothing in the
 * schema knows where an LGA *is* — so a choropleth would mean sourcing and
 * shipping 774 boundary polygons for a screen whose whole message is a
 * ranking. The stacked bars carry that message at a glance; the map can come
 * when there is geodata worth drawing.
 */
export function CoverageView({ days }: { days: AdminWindow }) {
  const { states, totals, isLoading, error } = useCoverage(days);
  const [openState, setOpenState] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Coverage"
        blurb={`Which LGAs have enough reporting to be trusted, over ${adminWindowPhrase(days)}.`}
      >
        <WindowSelector days={days} />
      </AdminPageHeader>

      {error ? (
        <p className="text-14 text-fault">{error}</p>
      ) : isLoading || !states || !totals ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <MetricTileSkeleton key={index} />
            ))}
          </div>
          <AdminTableSkeleton rows={8} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              label="LGAs reporting"
              value={totals.trackedCount.toLocaleString()}
              hint={`of ${totals.lgaCount.toLocaleString()} nationally.`}
              tone={totals.trackedCount === 0 ? "warn" : "default"}
            />
            <MetricTile
              label="Well covered"
              value={totals.wellCoveredCount.toLocaleString()}
              hint="Good or high confidence — enough people, often enough."
            />
            <MetricTile
              label="Silent states"
              value={totals.silentStateCount.toLocaleString()}
              tone={totals.silentStateCount > 0 ? "warn" : "default"}
              hint={`of ${totals.stateCount} with nobody reporting in ${adminWindowPhrase(days)}.`}
            />
            <MetricTile
              label="Logs in window"
              value={totals.logCount.toLocaleString()}
              hint="Flagged logs excluded, as everywhere else."
            />
          </div>

          <CoverageLegend />

          <AdminTable
            caption="Reporting coverage by state, least covered first"
            head={
              <>
                <Th>State</Th>
                <Th className="text-right">LGAs</Th>
                <Th className="text-right">Reporting</Th>
                <Th className="text-right">Well covered</Th>
                <Th className="text-right">Logs</Th>
                <Th className="w-40">Coverage</Th>
                <Th className="text-right">LGAs</Th>
              </>
            }
          >
            {states.map((state) => (
              <StateRows
                key={state.stateId}
                state={state}
                isOpen={openState === state.stateId}
                onToggle={() =>
                  setOpenState((current) =>
                    current === state.stateId ? null : state.stateId,
                  )
                }
              />
            ))}
          </AdminTable>
        </>
      )}
    </div>
  );
}

function StateRows({
  state,
  isOpen,
  onToggle,
}: {
  state: StateCoverage;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <Tr isSelected={isOpen}>
        <Td className="whitespace-nowrap">{state.stateName}</Td>
        <Td className="text-right font-mono text-14">{state.lgaCount}</Td>
        <Td className="text-right font-mono text-14">{state.trackedCount}</Td>
        <Td className="text-right font-mono text-14">{state.wellCoveredCount}</Td>
        <Td className="text-right font-mono text-14">{state.logCount}</Td>
        <Td>
          <CoverageBar counts={state.gradeCounts} stateName={state.stateName} />
        </Td>
        <Td className="text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="rounded border border-hairline px-2.5 py-1 text-14 text-text hover:border-text-muted"
          >
            {isOpen ? "Hide" : "Show"}
          </button>
        </Td>
      </Tr>

      {isOpen && (
        <tr>
          <td colSpan={7} className="border-b border-hairline bg-surface px-3 py-3">
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {state.lgas.map((lga) => (
                <li
                  key={lga.lga_id}
                  className="flex items-center justify-between gap-3 text-14"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <GradeDot grade={lga.grade} />
                    <span className="truncate">{lga.lga_name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-12 text-text-muted">
                    {lga.log_count > 0
                      ? `${lga.log_count} logs · ${lga.contributor_count} people`
                      : lga.last_log_at
                        ? `last logged ${formatRelativeTime(lga.last_log_at)}`
                        : "never logged"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-12 text-text-muted">
              {state.wellCoveredCount === 0
                ? `No LGA in ${state.stateName} clears ${GRADE_LABEL.good.toLowerCase()} yet.`
                : `${state.wellCoveredCount} of ${state.lgaCount} LGAs in ${state.stateName} clear ${GRADE_LABEL.good.toLowerCase()}.`}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
