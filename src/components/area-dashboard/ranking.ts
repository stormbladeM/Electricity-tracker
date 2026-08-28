/**
 * Turning the `lga_uptime_ranking` rows into the comparison chart and the
 * national best / least-served lists.
 *
 * The confidence bar matters most here: a single reporter in a quiet LGA can
 * post five "power's on" logs and sit at 100%. Those rows still show in the
 * comparison for the user's own state (with a sparse-coverage note), but they
 * are kept out of the national ranking entirely — a leaderboard has to earn
 * its places.
 */
import type { Database } from "@/lib/supabase/database.types";

export type LgaRankRow =
  Database["public"]["Functions"]["lga_uptime_ranking"]["Returns"][number];

export const RANKED_MIN_CONTRIBUTORS = 2;
export const RANKED_MIN_LOGS = 8;

export function isRanked(row: LgaRankRow): boolean {
  return (
    row.contributor_count >= RANKED_MIN_CONTRIBUTORS && row.log_count >= RANKED_MIN_LOGS
  );
}

export type RankedRow = LgaRankRow & {
  /** 1-based position among ranked LGAs, or null if below the confidence bar. */
  rank: number | null;
};

export type NationalRanking = {
  /** Highest uptime first. */
  best: RankedRow[];
  /** Lowest uptime first. */
  least: RankedRow[];
  /** How many LGAs cleared the confidence bar. */
  rankedTotal: number;
  /** The user's own LGA, ranked or not, if it appears at all. */
  mine: RankedRow | null;
};

function byUptimeDesc(a: LgaRankRow, b: LgaRankRow): number {
  return b.uptime_percent - a.uptime_percent || b.log_count - a.log_count;
}

/** LGAs in one state, most reliable first — the comparison chart's rows. */
export function rowsForState(rows: LgaRankRow[], stateId: string | null): LgaRankRow[] {
  if (!stateId) return [];
  return rows.filter((row) => row.state_id === stateId).sort(byUptimeDesc);
}

export function buildNationalRanking(
  rows: LgaRankRow[],
  myLgaId: string | null,
  take = 5,
): NationalRanking {
  const ranked = rows.filter(isRanked).sort(byUptimeDesc);
  const withRank: RankedRow[] = ranked.map((row, index) => ({ ...row, rank: index + 1 }));

  const mineRanked = withRank.find((row) => row.lga_id === myLgaId) ?? null;
  const mineRaw = mineRanked
    ? null
    : rows.find((row) => row.lga_id === myLgaId) ?? null;

  return {
    best: withRank.slice(0, take),
    least: withRank.slice(-take).reverse(),
    rankedTotal: withRank.length,
    mine: mineRanked ?? (mineRaw ? { ...mineRaw, rank: null } : null),
  };
}
