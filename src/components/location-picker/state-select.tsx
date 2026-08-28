"use client";

import { useStates } from "./use-states";

type StateSelectProps = {
  value: string | null;
  onChange: (stateId: string) => void;
};

export function StateSelect({ value, onChange }: StateSelectProps) {
  const { states, isLoading } = useStates();

  return (
    <label className="flex flex-col gap-2">
      <span className="text-14 text-text-muted">State</span>
      <select
        aria-label="State"
        className="rounded border border-hairline bg-surface px-3 py-2 text-16 text-text disabled:opacity-50"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="" disabled>
          {isLoading ? "Loading states…" : "Select a state"}
        </option>
        {states.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </select>
    </label>
  );
}
