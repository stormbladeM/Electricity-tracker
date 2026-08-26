"use client";

import { useState, type FormEvent } from "react";
import { StateSelect } from "./state-select";
import { LgaSelect } from "./lga-select";
import { useSaveLocation } from "./use-save-location";

type LocationPickerProps = {
  onComplete?: () => void;
};

export function LocationPicker({ onComplete }: LocationPickerProps) {
  const [stateId, setStateId] = useState<string | null>(null);
  const [lgaId, setLgaId] = useState<string | null>(null);
  const { save, isSaving, error } = useSaveLocation();

  function handleStateChange(nextStateId: string) {
    setStateId(nextStateId);
    setLgaId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stateId || !lgaId) return;
    if (await save(stateId, lgaId)) onComplete?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StateSelect value={stateId} onChange={handleStateChange} />
      <LgaSelect stateId={stateId} value={lgaId} onChange={setLgaId} />
      {error && <p className="text-14 text-fault">{error}</p>}
      <button
        type="submit"
        disabled={!stateId || !lgaId || isSaving}
        className="rounded bg-primary px-4 py-3 text-16 font-medium text-text disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
