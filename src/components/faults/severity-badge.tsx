import { SEVERITY_META, type FaultSeverity } from "./fault-types";

/**
 * Severity shown as a word *and* a 4-tick meter — never colour alone
 * (docs/design-system.md: "Never encode meaning in color alone — pair with
 * position, dash pattern, or hatch"). The tick count carries the ranking for
 * anyone who can't separate the warn/fault hues.
 */
export function SeverityBadge({
  severity,
  className,
}: {
  severity: FaultSeverity;
  className?: string;
}) {
  const meta = SEVERITY_META[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      title={meta.hint}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {Array.from({ length: 4 }, (_, i) => {
          const filled = i < meta.ticks;
          return (
            <span
              key={i}
              className={`w-0.5 rounded-full ${filled ? `bg-current ${meta.tone}` : "bg-hairline"}`}
              style={{ height: `${4 + i * 2}px` }}
            />
          );
        })}
      </span>
      <span className={`text-12 font-medium ${meta.tone}`}>{meta.label}</span>
    </span>
  );
}
