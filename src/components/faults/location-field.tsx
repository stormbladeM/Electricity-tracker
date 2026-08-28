"use client";

import { useState } from "react";
import { Crosshair, X } from "lucide-react";

export type Coords = { latitude: number; longitude: number };

type LocationFieldProps = {
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
};

/**
 * Optional GPS pin for the fault, from the browser's geolocation. A fault with
 * a pin shows on the map; one without still shows in the feed.
 */
export function LocationField({ value, onChange }: LocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser can't share a location.");
      return;
    }
    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setIsLocating(false);
      },
      () => {
        setError("Couldn't get your location. You can still report without a pin.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-14 font-medium text-text">Location (optional)</span>

      {value ? (
        <div className="flex items-center gap-2 text-14 text-text-muted">
          <Crosshair aria-hidden="true" size={16} strokeWidth={1.5} className="text-primary-text" />
          <span className="font-mono">
            {value.latitude}, {value.longitude}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove location pin"
            className="rounded p-1 text-text-muted hover:text-text"
          >
            <X aria-hidden="true" size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={locate}
          disabled={isLocating}
          className="flex w-fit items-center gap-2 rounded border border-hairline bg-surface px-4 py-3 text-14 text-text-muted hover:border-text-muted disabled:opacity-60"
        >
          <Crosshair aria-hidden="true" size={16} strokeWidth={1.5} />
          {isLocating ? "Finding you…" : "Pin my location"}
        </button>
      )}

      {error && (
        <p role="status" className="text-14 text-text-muted">
          {error}
        </p>
      )}
    </div>
  );
}
