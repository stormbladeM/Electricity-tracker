"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Scope } from "./scope";

export type ResolvedDisco = { name: string; shortName: string | null };

export type ResolvedScope = {
  kind: Scope;
  /** The active scope's name, for headings and copy. */
  name: string;
  /** Both names and slugs — the toggle labels itself, the share link needs both. */
  lgaName: string;
  lgaSlug: string | null;
  stateName: string;
  stateSlug: string | null;
  /** Every area whose logs roll up into the active scope. */
  areaIds: string[];
  /** The DisCo, when every area in scope shares one; null otherwise. */
  disco: ResolvedDisco | null;
};

type AreaDiscoRow = {
  id: string;
  disco: { name: string; short_name: string | null } | null;
};

function singleDisco(rows: AreaDiscoRow[]): ResolvedDisco | null {
  const seen = new Map<string, ResolvedDisco>();
  for (const row of rows) {
    if (row.disco) seen.set(row.disco.name, { name: row.disco.name, shortName: row.disco.short_name });
  }
  return seen.size === 1 ? [...seen.values()][0] : null;
}

/**
 * Turns "this scope, for this user" into the concrete set of areas to
 * aggregate, the names and slugs to show, and the serving DisCo.
 *
 * One area per LGA is all onboarding and the seed create today, so an LGA
 * scope is usually a single area and a state scope is one area per tracked
 * LGA. The queries are written for the general case regardless.
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
        supabase.from("states").select("name, slug").eq("id", stateId).maybeSingle(),
        supabase.from("lgas").select("name, slug").eq("id", lgaId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (state.error || lga.error || !state.data || !lga.data) return fail();

      const areaSelect = "id, disco:discos(name, short_name)";
      let areas: AreaDiscoRow[];
      if (scope === "lga") {
        const res = await supabase.from("areas").select(areaSelect).eq("lga_id", lgaId);
        if (cancelled) return;
        if (res.error) return fail();
        areas = (res.data ?? []) as AreaDiscoRow[];
      } else {
        const lgas = await supabase.from("lgas").select("id").eq("state_id", stateId);
        if (cancelled) return;
        if (lgas.error) return fail();
        const lgaIds = (lgas.data ?? []).map((row) => row.id);
        const res = lgaIds.length
          ? await supabase.from("areas").select(areaSelect).in("lga_id", lgaIds)
          : { data: [] as AreaDiscoRow[], error: null };
        if (cancelled) return;
        if (res.error) return fail();
        areas = (res.data ?? []) as AreaDiscoRow[];
      }

      setData({
        kind: scope,
        name: scope === "lga" ? lga.data.name : state.data.name,
        lgaName: lga.data.name,
        lgaSlug: lga.data.slug,
        stateName: state.data.name,
        stateSlug: state.data.slug,
        areaIds: areas.map((row) => row.id),
        disco: singleDisco(areas),
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
