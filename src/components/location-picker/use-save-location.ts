"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/use-auth";

// Named community/estate areas don't exist yet — only each LGA's default
// area (areas.name IS NULL, one per LGA, seeded alongside the LGAs).
// Picking a state and LGA resolves straight to that default area.
export function useSaveLocation() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (stateId: string, lgaId: string) => {
      if (!user) {
        setError("Not signed in yet. Try again in a moment.");
        return false;
      }

      setIsSaving(true);
      setError(null);
      const supabase = createClient();

      const { data: area, error: areaError } = await supabase
        .from("areas")
        .select("id")
        .eq("lga_id", lgaId)
        .is("name", null)
        .single();

      if (areaError || !area) {
        setError("Couldn't find that area. Check your connection and try again.");
        setIsSaving(false);
        return false;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ state_id: stateId, lga_id: lgaId, area_id: area.id })
        .eq("id", user.id);

      setIsSaving(false);

      if (profileError) {
        setError("Couldn't save your location. Check your connection and try again.");
        return false;
      }

      return true;
    },
    [user],
  );

  return { save, isSaving, error };
}
