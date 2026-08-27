"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { downscaleImage } from "./downscale-image";

type PhotoFieldProps = {
  /** The downscaled JPEG to upload, or null. */
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
};

/**
 * Optional photo for the report. The chosen image is downscaled in the browser
 * before it ever leaves the device — people report faults on bad connections
 * (CLAUDE.md quality floor) and the feed shows the photo small anyway.
 */
export function PhotoField({ value, onChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  // Revoke the previous object URL once it's no longer rendered.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      onChange(await downscaleImage(file));
    } catch {
      setError("Couldn't read that image. Try another one.");
    } finally {
      setIsProcessing(false);
    }
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-14 font-medium text-text">Photo (optional)</span>

      {previewUrl ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="The fault you're reporting"
            className="max-h-48 rounded border border-hairline"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute -right-2 -top-2 rounded-full border border-hairline bg-base p-1 text-text"
          >
            <X aria-hidden="true" size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-fit items-center gap-2 rounded border border-hairline bg-surface px-4 py-3 text-14 text-text-muted hover:border-text-muted"
        >
          <Camera aria-hidden="true" size={16} strokeWidth={1.5} />
          {isProcessing ? "Processing…" : "Add a photo"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p role="status" className="text-14 text-fault">
          {error}
        </p>
      )}
    </div>
  );
}
