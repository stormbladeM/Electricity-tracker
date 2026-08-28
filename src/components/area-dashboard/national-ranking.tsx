import { isRanked, type NationalRanking, type RankedRow } from "./ranking";
import { LgaRow } from "./lga-row";

/**
 * Best and least-served LGAs nationally. Only LGAs that cleared the
 * confidence bar are placed (see ranking.ts); everything here has real
 * reporting behind it.
 *
 * If the user's own LGA is tracked but sits outside both lists, its position
 * is named in a line underneath so they can always find themselves.
 */
const MIN_RANKED_FOR_LISTS = 4;

export function NationalRankingView({
  ranking,
  myLgaId,
}: {
  ranking: NationalRanking;
  myLgaId: string | null;
}) {
  const { best, least, rankedTotal, mine } = ranking;

  if (rankedTotal < MIN_RANKED_FOR_LISTS) {
    return (
      <p className="text-14 text-text-muted">
        Only {rankedTotal} {rankedTotal === 1 ? "LGA has" : "LGAs have"} enough
        reports to rank so far. This fills in as coverage grows.
      </p>
    );
  }

  const shownIds = new Set([...best, ...least].map((row) => row.lga_id));
  const mineElsewhere = mine && mine.rank != null && !shownIds.has(mine.lga_id);

  return (
    <div className="flex flex-col gap-6">
      <RankGroup title="Best served" rows={best} myLgaId={myLgaId} />
      <RankGroup title="Least served" rows={least} myLgaId={myLgaId} />

      {mineElsewhere && (
        <p className="text-12 text-text-muted">
          {mine.lga_name} ranks {mine.rank} of {rankedTotal} tracked LGAs.
        </p>
      )}
    </div>
  );
}

function RankGroup({
  title,
  rows,
  myLgaId,
}: {
  title: string;
  rows: RankedRow[];
  myLgaId: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-12 font-medium text-text-muted uppercase tracking-wide">{title}</h3>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <LgaRow
            key={row.lga_id}
            name={row.lga_name}
            sublabel={row.state_name}
            percent={row.uptime_percent}
            logCount={row.log_count}
            contributorCount={row.contributor_count}
            ranked={isRanked(row)}
            isMine={row.lga_id === myLgaId}
            rank={row.rank}
          />
        ))}
      </ul>
    </div>
  );
}
