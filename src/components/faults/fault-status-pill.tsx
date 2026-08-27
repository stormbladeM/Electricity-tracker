import { FAULT_STATUS_META, type FaultStatus } from "./fault-types";

/**
 * The fault's lifecycle stage, in the mono face like every other status label
 * in the product. `--fault` red is spent only at the two alarm edges —
 * "Reported" (nobody has confirmed it yet) and "Rejected" — so a mid-lifecycle
 * fault doesn't shout.
 */
export function FaultStatusPill({
  status,
  className,
}: {
  status: FaultStatus;
  className?: string;
}) {
  const meta = FAULT_STATUS_META[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-12 uppercase tracking-wide ${
        meta.isAlarm ? "text-fault" : "text-text-muted"
      } ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          meta.isAlarm ? "bg-fault" : meta.isOpen ? "bg-warn" : "bg-text-muted"
        }`}
      />
      {meta.label}
    </span>
  );
}
