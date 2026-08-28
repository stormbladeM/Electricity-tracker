import { Info } from "lucide-react";
import { confidenceLevel, confidenceNote, type Coverage } from "./confidence";

/**
 * "Based on 18 logs from 3 contributors. More reports will sharpen this."
 *
 * Sparse coverage is `--warn`, its one job. The colour is never the only
 * signal though: the sparse line also carries the icon and the extra sentence,
 * so the warning survives a monochrome screen or a colour-blind reader.
 *
 * The icon is Lucide's, unthemed and at Lucide's own 1.5px stroke. A note about
 * data quality is not an electrical concept, so it does not get a bolt.
 */
export function ConfidenceNote({ coverage }: { coverage: Coverage }) {
  const level = confidenceLevel(coverage);
  const note = confidenceNote(coverage);
  if (!note) return null;

  if (level !== "sparse") {
    return <p className="text-12 text-text-muted">{note}</p>;
  }

  return (
    <p className="flex items-start gap-2 text-12 text-warn">
      <Info
        aria-hidden="true"
        className="mt-px shrink-0"
        size={14}
        strokeWidth={1.5}
      />
      <span>{note}</span>
    </p>
  );
}
