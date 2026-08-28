"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The reference-table writes, all five of them Postgres functions from
 * migration 0011.
 *
 * RLS would let an admin write these tables directly — 0001 grants exactly
 * that. The functions exist so each edit carries an audit row written in the
 * same transaction, and so the two rules that are not expressible as a
 * constraint hold: an LGA's default area cannot be renamed away, and it cannot
 * be the source of a merge. Both would leave the LGA with nowhere for a
 * contributor's log to land.
 */
export function useLocationActions() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    // PromiseLike, not Promise: supabase's query builders are thenables that
    // only become promises when awaited, so the callers can hand one straight
    // over without wrapping it.
    async (
      work: () => PromiseLike<{ error: { message: string } | null }>,
      failure: string,
    ) => {
      setIsSaving(true);
      setError(null);

      const { error: rpcError } = await work();

      setIsSaving(false);
      if (rpcError) {
        setError(failure);
        return false;
      }
      return true;
    },
    [],
  );

  const saveState = useCallback(
    (stateId: string, name: string, code: string, slug: string) =>
      run(
        () =>
          createClient().rpc("admin_save_state", {
            p_state_id: stateId,
            p_name: name,
            p_code: code,
            p_slug: slug,
          }),
        "Couldn't save that state. Check the name and code are not already taken.",
      ),
    [run],
  );

  const saveLga = useCallback(
    (lgaId: string, name: string, slug: string) =>
      run(
        () =>
          createClient().rpc("admin_save_lga", {
            p_lga_id: lgaId,
            p_name: name,
            p_slug: slug,
          }),
        "Couldn't save that LGA. Check the name is not already used in this state.",
      ),
    [run],
  );

  const saveArea = useCallback(
    (
      area: { id?: string; lgaId: string; name: string; slug: string; discoId: string },
    ) =>
      run(
        () =>
          createClient().rpc("admin_save_area", {
            p_area_id: area.id,
            p_lga_id: area.lgaId,
            p_name: area.name,
            p_slug: area.slug,
            p_disco_id: area.discoId || undefined,
          }),
        "Couldn't save that area. Check the name is not already used in this LGA.",
      ),
    [run],
  );

  const mergeAreas = useCallback(
    (sourceId: string, targetId: string, note?: string) =>
      run(
        () =>
          createClient().rpc("admin_merge_areas", {
            p_source_id: sourceId,
            p_target_id: targetId,
            p_note: note?.trim() ? note.trim() : undefined,
          }),
        "Couldn't merge those areas. Check both are in the same LGA.",
      ),
    [run],
  );

  const saveDisco = useCallback(
    (discoId: string | undefined, name: string, shortName: string) =>
      run(
        () =>
          createClient().rpc("admin_save_disco", {
            p_disco_id: discoId,
            p_name: name,
            p_short_name: shortName,
          }),
        "Couldn't save that DisCo. Check the name is not already taken.",
      ),
    [run],
  );

  return { saveState, saveLga, saveArea, mergeAreas, saveDisco, isSaving, error };
}
