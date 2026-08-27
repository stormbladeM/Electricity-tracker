import { SeverityBadge } from "./severity-badge";
import { FAULT_SEVERITIES, SEVERITY_META, type FaultSeverity } from "./fault-types";

/** Segmented control for how bad the fault is. Four options, one choice. */
export function SeverityPicker({
  value,
  onChange,
}: {
  value: FaultSeverity;
  onChange: (severity: FaultSeverity) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-14 font-medium text-text">How bad is it?</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FAULT_SEVERITIES.map((severity) => {
          const selected = value === severity;
          return (
            <button
              key={severity}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(severity)}
              className={`flex items-center justify-center rounded border px-3 py-2.5 transition-colors ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-hairline bg-surface hover:border-text-muted"
              }`}
            >
              <SeverityBadge severity={severity} />
            </button>
          );
        })}
      </div>
      <p className="text-12 text-text-muted">{SEVERITY_META[value].hint}</p>
    </fieldset>
  );
}
