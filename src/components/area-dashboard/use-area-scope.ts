"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Scope } from "./scope";

export type ResolvedScope = {
  kind: Scope;
  /** The active scope's name, for headings and copy. */
  name: string;
  /** Both names — the scope toggle labels itself with them. */
  lgaName: string;
  stateName: string;
  /** Every area whose logs roll up into the active scope. */
  areaIds: string[];
};

/**
 * Turns "this scope, for this user" into the concrete set of areas to
 * aggregate and the names to show.
 *
 * One area per LGA is all onboarding and the seed create today (the LGA
 * default area), so an LGA scope is usually a single area and a state scope
 * is one area per tracked LGA. The queries are written for the general case
 * regardless, so nothing here changes when estate-level areas arrive.
 *
 * Both the LGA and the state name are always fetched — the scope toggle needs
 * to label both options even though only one is active.
 *
 * Work starts after an `await` so no setState runs during the effect's render
 * pass (react-hooks/set-state-in-effect), matching the M2/M3 hooks.
 */
export function useAreaScope(
  scope: Scope,
  stateId: string | null | undefined,
  lgaId: string | null | undefined,
) {
  const [data, setData] = useState<ResolvedScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!stateId || !lgaId) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      const fail = () => {
        if (cancelled) return;
        setError("Couldn't load this area. Check your connection and try again.");
        setIsLoading(false);
      };

      const [state, lga] = await Promise.all([
        supabase.from("states").select("name").eq("id", stateId).maybeSingle(),
        supabase.from("lgas").select("name").eq("id", lgaId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (state.error || lga.error || !state.data || !lga.data) return fail();

      let areaIds: string[];
      if (scope === "lga") {
        const areas = await supabase.from("areas").select("id").eq("lga_id", lgaId);
        if (cancelled) return;
        if (areas.error) return fail();
        areaIds = (areas.data ?? []).map((row) => row.id);
      } else {
        const lgas = await supabase.from("lgas").select("id").eq("state_id", stateId);
        if (cancelled) return;
        if (lgas.error) return fail();
        const lgaIds = (lgas.data ?? []).map((row) => row.id);
        const areas = lgaIds.length
          ? await supabase.from("areas").select("id").in("lga_id", lgaIds)
          : { data: [] as { id: string }[], error: null };
        if (cancelled) return;
        if (areas.error) return fail();
        areaIds = (areas.data ?? []).map((row) => row.id);
      }

      setData({
        kind: scope,
        name: scope === "lga" ? lga.data.name : state.data.name,
        lgaName: lga.data.name,
        stateName: state.data.name,
        areaIds,
      });
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [scope, stateId, lgaId]);

  return { data, isLoading, error };
}
