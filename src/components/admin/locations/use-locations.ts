"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { useAdminRows } from "../ui/use-admin-rows";

export type StateRow = Tables<"states">;
export type LgaRow = Tables<"lgas">;
export type AreaRow = Tables<"areas">;
export type DiscoRow = Tables<"discos">;

/**
 * The four reference tables, each with a refetch.
 *
 * The location picker has its own `useStates` / `useLgas`, and these
 * deliberately do not replace them: the picker reads once during onboarding
 * and never needs to reload, while every read here is followed by an edit and
 * has to show the result. Rather than growing the onboarding hooks a refetch
 * they have no use for, the admin panel keeps its own — over the shared
 * `useAdminRows` loop, so it is three lines each rather than a fourth copy of
 * the fetch-and-cancel dance.
 *
 * All four are plain PostgREST selects: these tables are publicly readable
 * (0001), and only the writes need elevating.
 */
export function useStates() {
  return useAdminRows<StateRow>(
    useCallback(async () => {
      const supabase = createClient();
      return supabase.from("states").select("*").order("name");
    }, []),
    "Couldn't load states. Check your connection and try again.",
  );
}

export function useLgas(stateId: string | null) {
  return useAdminRows<LgaRow>(
    useCallback(async () => {
      const supabase = createClient();
      if (!stateId) return { data: [], error: null };
      return supabase.from("lgas").select("*").eq("state_id", stateId).order("name");
    }, [stateId]),
    "Couldn't load LGAs. Check your connection and try again.",
  );
}

/**
 * Areas of one LGA, the default area first — it is the one every LGA has and
 * the one logs land in, so it belongs at the top rather than alphabetised into
 * the middle of the estates.
 */
export function useAreas(lgaId: string | null) {
  return useAdminRows<AreaRow>(
    useCallback(async () => {
      const supabase = createClient();
      if (!lgaId) return { data: [], error: null };
      return supabase
        .from("areas")
        .select("*")
        .eq("lga_id", lgaId)
        .order("name", { ascending: true, nullsFirst: true });
    }, [lgaId]),
    "Couldn't load areas. Check your connection and try again.",
  );
}

export function useDiscos() {
  return useAdminRows<DiscoRow>(
    useCallback(async () => {
      const supabase = createClient();
      return supabase.from("discos").select("*").order("name");
    }, []),
    "Couldn't load DisCos. Check your connection and try again.",
  );
}
