import {
  GRADES,
  GRADE_LABEL,
  type ConfidenceGrade,
} from "@/components/area-dashboard/area-confidence";

/**
 * One state's LGAs as a stacked bar, worst grade on the left.
 *
 * Grade is carried by position first and colour second: the segments are
 * always in the same order, so a bar that is mostly left-hand mass reads as
 * thin coverage even in greyscale. Only `--warn` appears, and only on the
 * "low confidence" segment — that is the token's actual job (sparse or
 * degraded data). The better grades step up through the neutral text tones
 * rather than borrowing a signal colour to mean "good", which is not a job any
 * token in this system has.
 */
const SEGMENT_CLASS: Record<ConfidenceGrade, string> = {
  none: "bg-hairline",
  low: "bg-warn",
  fair: "bg-text-muted",
  good: "bg-text/60",
  high: "bg-text",
};

export function CoverageBar({
  counts,
  stateName,
}: {
  counts: Record<ConfidenceGrade, number>;
  stateName: string;
}) {
  const total = GRADES.reduce((sum, grade) => sum + counts[grade], 0);
  if (total === 0) return null;

  const summary = GRADES.filter((grade) => counts[grade] > 0)
    .map((grade) => `${counts[grade]} ${GRADE_LABEL[grade].toLowerCase()}`)
    .join(", ");

  return (
    <span
      role="img"
      aria-label={`${stateName} coverage: ${summary}.`}
      className="flex h-2 w-full min-w-24 overflow-hidden rounded-full bg-hairline"
    >
      {GRADES.map((grade) =>
        counts[grade] === 0 ? null : (
          <span
            key={grade}
            className={SEGMENT_CLASS[grade]}
            style={{ width: `${(counts[grade] / total) * 100}%` }}
            title={`${counts[grade]} ${GRADE_LABEL[grade].toLowerCase()}`}
          />
        ),
      )}
    </span>
  );
}

/** The key for the bar, shown once above the table. */
export function CoverageLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {GRADES.map((grade) => (
        <li key={grade} className="flex items-center gap-1.5 text-12 text-text-muted">
          <span
            aria-hidden="true"
            className={`h-2 w-4 rounded-full ${SEGMENT_CLASS[grade]}`}
          />
          {GRADE_LABEL[grade]}
        </li>
      ))}
    </ul>
  );
}

/** The dot beside an LGA name in the drill-down. */
export function GradeDot({ grade }: { grade: ConfidenceGrade }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${SEGMENT_CLASS[grade]}`}
    />
  );
}
