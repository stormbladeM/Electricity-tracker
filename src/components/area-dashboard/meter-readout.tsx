/**
 * The live uptime percentage, on the seven-segment meter face.
 *
 * design-system.md reserves DSEG7 for exactly two things; this is one of them
 * (the other is the status duration counter). It is rendered the way a real
 * meter looks — every segment faintly lit in `--hairline` behind the value,
 * so the digits sit in a full "88.8" ghost rather than floating alone.
 *
 * Not `--on`: that colour means "power is on" and nothing else. An uptime
 * figure is a statistic, so the lit value is plain `--text`.
 */
type MeterReadoutProps = {
  /** 0–100, or null when there's nothing to show. */
  percent: number | null;
};

export function MeterReadout({ percent }: MeterReadoutProps) {
  const value = percent === null ? "--.-" : percent.toFixed(1);
  // Every digit lit, decimal point kept in place — the unlit backdrop.
  const ghost = value.replace(/[0-9]/g, "8");

  return (
    <div
      className="flex items-baseline gap-1.5"
      role="img"
      aria-label={
        percent === null
          ? "Uptime not available yet"
          : `${value} percent uptime`
      }
    >
      <span className="relative font-meter text-32 leading-none tracking-[0.06em]">
        <span aria-hidden="true" className="text-hairline">
          {ghost}
        </span>
        <span aria-hidden="true" className="absolute inset-0 text-text">
          {value}
        </span>
      </span>
      <span aria-hidden="true" className="font-meter text-18 text-text-muted">
        %
      </span>
    </div>
  );
}

/** Loading shape — the ghost with no value over it. */
export function MeterReadoutSkeleton() {
  return (
    <div className="flex items-baseline gap-1.5" aria-hidden="true">
      <span className="font-meter text-32 leading-none tracking-[0.06em] text-hairline">
        88.8
      </span>
      <span className="font-meter text-18 text-hairline">%</span>
    </div>
  );
}
