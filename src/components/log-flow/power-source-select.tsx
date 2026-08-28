"use client";

import type { Enums } from "@/lib/supabase/database.types";

type PowerSource = Enums<"power_source">;

const OPTIONS: { value: PowerSource; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "generator", label: "Generator" },
  { value: "solar", label: "Solar" },
  { value: "inverter", label: "Inverter" },
];

type PowerSourceSelectProps = {
  value: PowerSource | null;
  onChange: (value: PowerSource | null) => void;
};

/**
 * Optional secondary tag on a log — CLAUDE.md marks power_source optional,
 * so tapping a pill toggles it on or off and submission never depends on it.
 */
export function PowerSourceSelect({ value, onChange }: PowerSourceSelectProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-14 text-text-muted">Power source (optional)</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
              className={`rounded border px-3 py-2 text-14 ${
                selected
                  ? "border-primary bg-primary text-text"
                  : "border-hairline bg-surface text-text-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
