import { Info } from "lucide-react";
import {
  GRADES,
  GRADE_LABEL,
  confidenceGrade,
  confidenceHint,
  confidenceSummary,
  type AreaCoverage,
  type ConfidenceGrade,
} from "./area-confidence";

/**
 * The graded trust indicator that sits under the uptime figure.
 *
 * Grade is shown three ways, never colour alone: the word ("Good confidence"),
 * a four-bar strength meter filled to the grade, and — only when coverage is
 * thin — `--warn` plus the info icon and a follow-up line. On a monochrome or
 * colour-blind screen the bars and the wording still carry it.
 */
const BAR_COUNT = 4;

/** Filled bars per grade: none → 0 … high → 4. */
function filledBars(grade: ConfidenceGrade): number {
  return Math.max(0, GRADES.indexOf(grade));
}

function isThin(grade: ConfidenceGrade): boolean {
  return grade === "none" || grade === "low";
}

export function ConfidenceBadge({ coverage }: { coverage: AreaCoverage }) {
  const grade = confidenceGrade(coverage);
  const filled = filledBars(grade);
  const thin = isThin(grade);
  const hint = confidenceHint(grade);
  const summary = coverage.hasAnyKnowledge ? confidenceSummary(coverage) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex items-end gap-0.5"
        >
          {Array.from({ length: BAR_COUNT }, (_, index) => (
            <span
              key={index}
              className={`w-1 rounded-full ${
                index < filled
                  ? thin
                    ? "bg-warn"
                    : "bg-text"
                  : "bg-hairline"
              }`}
              style={{ height: `${6 + index * 3}px` }}
            />
          ))}
        </span>

        <span
          className={`text-14 font-medium ${thin ? "text-warn" : "text-text"}`}
        >
          {GRADE_LABEL[grade]}
        </span>
      </div>

      {summary && (
        <p
          className={`flex items-start gap-1.5 text-12 ${
            thin ? "text-warn" : "text-text-muted"
          }`}
        >
          {thin && (
            <Info aria-hidden="true" className="mt-px shrink-0" size={13} strokeWidth={1.5} />
          )}
          <span>
            {summary}
            {hint ? ` ${hint}` : ""}
          </span>
        </p>
      )}

      {!summary && hint && (
        <p className="text-12 text-text-muted">{hint}</p>
      )}
    </div>
  );
}
