import { isRanked, type LgaRankRow } from "./ranking";
import { LgaRow } from "./lga-row";

/**
 * The user's LGA against the others in their state, most reliable first
 * (design-system.md section 4: "LGA comparison — one ribbon per LGA, stacked
 * and labeled"). Their own row is marked rather than recoloured.
 *
 * Low-confidence LGAs stay in this list — a neighbour with three logs is
 * still the neighbour you have — but their bar is muted and the coverage
 * note explains the figure.
 */
export function LgaComparison({
  rows,
  myLgaId,
  stateName,
}: {
  rows: LgaRankRow[];
  myLgaId: string | null;
  stateName: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-14 text-text-muted">
        No LGAs in {stateName} are being tracked yet.
      </p>
    );
  }

  if (rows.length === 1) {
    return (
      <p className="text-14 text-text-muted">
        {rows[0].lga_name} is the only LGA in {stateName} being tracked so far. More
        reports elsewhere will make a comparison possible.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <LgaRow
          key={row.lga_id}
          name={row.lga_name}
          percent={row.uptime_percent}
          logCount={row.log_count}
          contributorCount={row.contributor_count}
          ranked={isRanked(row)}
          isMine={row.lga_id === myLgaId}
        />
      ))}
    </ul>
  );
}
