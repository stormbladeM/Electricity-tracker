/**
 * Folding 774 LGA rows into what the coverage screen shows.
 *
 * The grade comes from the area dashboard's `confidenceGrade` rather than a
 * second set of thresholds. That matters: "well covered" in the admin panel
 * has to mean exactly what "Good confidence" means on the badge a contributor
 * reads, or the two screens quietly disagree about the same LGA.
 *
 * A caveat worth knowing when reading the state totals: contributors are
 * summed across LGAs, so somebody who logs in two LGAs counts twice at state
 * level. The true national figure is on the overview, which counts distinct
 * users in SQL. Here the number is a rough measure of reporting spread, not a
 * headcount.
 */
import {
  GRADES,
  confidenceGrade,
  type ConfidenceGrade,
} from "@/components/area-dashboard/area-confidence";
import type { Database } from "@/lib/supabase/database.types";

export type CoverageRow =
  Database["public"]["Functions"]["admin_lga_coverage"]["Returns"][number];

export type GradedLga = CoverageRow & { grade: ConfidenceGrade };

/** Good or high — enough different people, often enough, to hold up. */
export const WELL_COVERED: ConfidenceGrade[] = ["good", "high"];

export function lgaGrade(row: CoverageRow, days: number): ConfidenceGrade {
  return confidenceGrade({
    logCount: row.log_count,
    contributorCount: row.contributor_count,
    areaCount: 1,
    dayCount: days,
    hasAnyKnowledge: row.log_count > 0,
  });
}

export type StateCoverage = {
  stateId: string;
  stateName: string;
  lgaCount: number;
  /** LGAs with at least one log in the window. */
  trackedCount: number;
  /** LGAs graded good or high. */
  wellCoveredCount: number;
  logCount: number;
  contributorCount: number;
  faultCount: number;
  gradeCounts: Record<ConfidenceGrade, number>;
  lgas: GradedLga[];
};

export type CoverageTotals = {
  lgaCount: number;
  trackedCount: number;
  wellCoveredCount: number;
  logCount: number;
  stateCount: number;
  /** States where not one LGA reported in the window. */
  silentStateCount: number;
};

function emptyGradeCounts(): Record<ConfidenceGrade, number> {
  return { none: 0, low: 0, fair: 0, good: 0, high: 0 };
}

/**
 * States worst-first: the ones with the fewest tracked LGAs at the top, and
 * among those the biggest states first. That ordering is the screen's whole
 * argument — the top row is where the next contributor is worth the most.
 */
export function byState(rows: CoverageRow[], days: number): StateCoverage[] {
  const states = new Map<string, StateCoverage>();

  for (const row of rows) {
    let state = states.get(row.state_id);
    if (!state) {
      state = {
        stateId: row.state_id,
        stateName: row.state_name,
        lgaCount: 0,
        trackedCount: 0,
        wellCoveredCount: 0,
        logCount: 0,
        contributorCount: 0,
        faultCount: 0,
        gradeCounts: emptyGradeCounts(),
        lgas: [],
      };
      states.set(row.state_id, state);
    }

    const grade = lgaGrade(row, days);
    state.lgaCount += 1;
    state.logCount += row.log_count;
    state.contributorCount += row.contributor_count;
    state.faultCount += row.fault_count;
    state.gradeCounts[grade] += 1;
    if (row.log_count > 0) state.trackedCount += 1;
    if (WELL_COVERED.includes(grade)) state.wellCoveredCount += 1;
    state.lgas.push({ ...row, grade });
  }

  for (const state of states.values()) {
    state.lgas.sort(
      (a, b) =>
        GRADES.indexOf(b.grade) - GRADES.indexOf(a.grade) ||
        b.log_count - a.log_count ||
        a.lga_name.localeCompare(b.lga_name),
    );
  }

  return [...states.values()].sort(
    (a, b) =>
      a.trackedCount - b.trackedCount ||
      b.lgaCount - a.lgaCount ||
      a.stateName.localeCompare(b.stateName),
  );
}

export function coverageTotals(states: StateCoverage[]): CoverageTotals {
  return states.reduce<CoverageTotals>(
    (totals, state) => ({
      lgaCount: totals.lgaCount + state.lgaCount,
      trackedCount: totals.trackedCount + state.trackedCount,
      wellCoveredCount: totals.wellCoveredCount + state.wellCoveredCount,
      logCount: totals.logCount + state.logCount,
      stateCount: totals.stateCount + 1,
      silentStateCount: totals.silentStateCount + (state.trackedCount === 0 ? 1 : 0),
    }),
    {
      lgaCount: 0,
      trackedCount: 0,
      wellCoveredCount: 0,
      logCount: 0,
      stateCount: 0,
      silentStateCount: 0,
    },
  );
}
