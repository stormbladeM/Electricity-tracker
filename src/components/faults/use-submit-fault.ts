"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type SubmitFaultArgs = {
  userId: string;
  areaId: string;
  lgaId: string;
  stateId: string;
  discoId: string | null;
  faultType: Enums<"fault_type">;
  severity: Enums<"fault_severity">;
  description: string;
  /** Already downscaled to a JPEG by the form; null when no photo. */
  photo: Blob | null;
  latitude: number | null;
  longitude: number | null;
};

type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: "offline" | "error"; message: string };

const OFFLINE_MESSAGE = "You're offline. Reconnect and try again.";
const ERROR_MESSAGE = "Couldn't send that report. Check your connection and try again.";

/**
 * The fault insert (and its photo upload), as a pure mutation — same stance as
 * use-submit-log.ts. It never touches the caller's form state, so a failed
 * submit loses nothing: the form keeps every field and the user can retry.
 * A full offline sync queue is deliberately out of scope for M5 (see the plan);
 * this just tells offline and connection failures apart for the copy.
 */
export function useSubmitFault() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (args: SubmitFaultArgs): Promise<SubmitResult> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { ok: false, reason: "offline", message: OFFLINE_MESSAGE };
    }

    setIsSubmitting(true);
    const supabase = createClient();

    let photoUrl: string | null = null;
    if (args.photo) {
      const path = `${args.userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fault-photos")
        .upload(path, args.photo, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setIsSubmitting(false);
        return { ok: false, reason: offlineOrError(), message: messageFor(offlineOrError()) };
      }
      photoUrl = supabase.storage.from("fault-photos").getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("fault_reports")
      .insert({
        user_id: args.userId,
        area_id: args.areaId,
        lga_id: args.lgaId,
        state_id: args.stateId,
        disco_id: args.discoId,
        fault_type: args.faultType,
        severity: args.severity,
        description: args.description.trim() || null,
        photo_url: photoUrl,
        latitude: args.latitude,
        longitude: args.longitude,
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (error || !data) {
      return { ok: false, reason: offlineOrError(), message: messageFor(offlineOrError()) };
    }

    return { ok: true, id: data.id };
  }, []);

  return { submit, isSubmitting };
}

function offlineOrError(): "offline" | "error" {
  return typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error";
}

function messageFor(reason: "offline" | "error"): string {
  return reason === "offline" ? OFFLINE_MESSAGE : ERROR_MESSAGE;
}
