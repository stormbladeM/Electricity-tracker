"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useProfile } from "@/lib/auth/use-profile";
import { useLga } from "@/lib/hooks/use-lga";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";
import { FaultTypePicker } from "./fault-type-picker";
import { LocationField, type Coords } from "./location-field";
import { PhotoField } from "./photo-field";
import { SeverityPicker } from "./severity-picker";
import { useSubmitFault } from "./use-submit-fault";

const DESCRIPTION_MAX = 2000;

/**
 * The fault report form. Reads the signed-in user's saved area exactly like the
 * home screen — redirect to onboarding if they haven't picked one. A failed
 * submit keeps every field (useSubmitFault never touches this state), so the
 * user just fixes their connection and presses the button again.
 */
export function ReportForm() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { lga } = useLga(profile?.lga_id);
  const { submit, isSubmitting } = useSubmitFault();

  const [faultType, setFaultType] = useState<Enums<"fault_type"> | null>(null);
  const [severity, setSeverity] = useState<Enums<"fault_severity">>("medium");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = isAuthLoading || isProfileLoading;

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded bg-surface" aria-busy="true" />;
  }

  if (!profile?.area_id || !profile.lga_id || !profile.state_id) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-16 text-text">Set your area before reporting a fault.</p>
        <Link
          href="/onboarding"
          className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Choose your area
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile?.area_id || !profile.lga_id || !profile.state_id) return;
    if (!faultType) {
      setError("Pick what's wrong first.");
      return;
    }
    setError(null);

    // disco lives on the area, not the profile — look it up so the report is
    // attributed to the right DisCo for the M6 triage metrics.
    const { data: area } = await createClient()
      .from("areas")
      .select("disco_id")
      .eq("id", profile.area_id)
      .maybeSingle();

    const result = await submit({
      userId: user.id,
      areaId: profile.area_id,
      lgaId: profile.lga_id,
      stateId: profile.state_id,
      discoId: area?.disco_id ?? null,
      faultType,
      severity,
      description,
      photo,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });

    if (result.ok) {
      router.push(`/faults/${result.id}?reported=1`);
      return;
    }
    setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/faults"
          className="flex w-fit items-center gap-1.5 rounded text-14 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
          Faults
        </Link>
        <h1 className="font-display text-32 font-medium text-text">Report a fault</h1>
        <p className="text-14 text-text-muted">
          {`In ${lga?.name ?? "your area"}. Neighbours can confirm it once it's posted.`}
        </p>
      </header>

      <FaultTypePicker value={faultType} onChange={setFaultType} />
      <SeverityPicker value={severity} onChange={setSeverity} />

      <div className="flex flex-col gap-2">
        <label htmlFor="fault-description" className="text-14 font-medium text-text">
          Description (optional)
        </label>
        <textarea
          id="fault-description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          rows={4}
          placeholder="What happened, and where exactly?"
          className="rounded border border-hairline bg-surface p-3 text-16 text-text placeholder:text-text-muted"
        />
        <p className="text-12 text-text-muted">
          {description.length}/{DESCRIPTION_MAX}
        </p>
      </div>

      <PhotoField value={photo} onChange={setPhoto} />
      <LocationField value={coords} onChange={setCoords} />

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-primary px-4 py-3 text-16 font-medium text-text disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Report fault"}
        </button>
        {error && (
          <p role="status" className="text-14 text-fault">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
