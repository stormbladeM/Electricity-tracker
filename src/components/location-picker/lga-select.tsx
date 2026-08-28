"use client";

import { useLgas } from "./use-lgas";

type LgaSelectProps = {
  stateId: string | null;
  value: string | null;
  onChange: (lgaId: string) => void;
};

export function LgaSelect({ stateId, value, onChange }: LgaSelectProps) {
  const { lgas, isLoading } = useLgas(stateId);

  return (
    <label className="flex flex-col gap-2">
      <span className="text-14 text-text-muted">LGA</span>
      <select
        aria-label="LGA"
        className="rounded border border-hairline bg-surface px-3 py-2 text-16 text-text disabled:opacity-50"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!stateId || isLoading}
      >
        <option value="" disabled>
          {!stateId ? "Select a state first" : isLoading ? "Loading LGAs…" : "Select an LGA"}
        </option>
        {lgas.map((lga) => (
          <option key={lga.id} value={lga.id}>
            {lga.name}
          </option>
        ))}
      </select>
    </label>
  );
}
