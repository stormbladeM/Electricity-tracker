/**
 * A single uptime figure as a horizontal bar — the mark the comparison chart
 * and the ranking rows are built from.
 *
 * `--series-1` is the chart-series colour; a low-confidence row is drawn in
 * `--hairline` instead so a thinly-evidenced bar never reads as a strong
 * result. The figure sits beside it in text too, so the bar is never the only
 * carrier of the number.
 */
type UptimeBarProps = {
  /** 0–100. */
  percent: number;
  /** Draw muted when the row is below the confidence bar. */
  muted?: boolean;
};

export function UptimeBar({ percent, muted = false }: UptimeBarProps) {
  const width = Math.max(0, Math.min(100, percent));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-off" aria-hidden="true">
      <div
        className={`h-full rounded-full ${muted ? "bg-hairline" : "bg-series-1"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
