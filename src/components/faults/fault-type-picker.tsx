import { FaultTypeIcon } from "./fault-type-icon";
import { FAULT_TYPES, FAULT_TYPE_META, type FaultType } from "./fault-types";

/**
 * The fault-type grid on the report form. A radio group under the hood — one
 * choice, keyboard-navigable, each option labelled and describable.
 */
export function FaultTypePicker({
  value,
  onChange,
}: {
  value: FaultType | null;
  onChange: (type: FaultType) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-14 font-medium text-text">{"What's wrong?"}</legend>
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FAULT_TYPES.map((type) => {
          const selected = value === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(type)}
              className={`flex flex-col items-center gap-1.5 rounded border p-3 text-center transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-text"
                  : "border-hairline bg-surface text-text-muted hover:border-text-muted"
              }`}
            >
              <FaultTypeIcon type={type} className={selected ? "text-primary-text" : ""} />
              <span className="text-12 font-medium text-text">{FAULT_TYPE_META[type].label}</span>
            </button>
          );
        })}
      </div>
      {value && <p className="text-12 text-text-muted">{FAULT_TYPE_META[value].hint}</p>}
    </fieldset>
  );
}
