"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FaultStatus } from "@/components/faults/fault-types";

/**
 * The two triage writes, both Postgres functions from migration 0009.
 *
 * 0001 does give moderators a plain UPDATE policy on fault_reports, and these
 * could have been table updates — but a status change that leaves no audit row,
 * or that sets resolved_at on a report nobody resolved, is exactly what the
 * functions exist to prevent. The client never gets to do half of it.
 */
export function useTriageActions() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback(
    async (faultId: string, status: FaultStatus, note?: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("set_fault_status", {
        p_fault_id: faultId,
        p_status: status,
        p_note: note?.trim() ? note.trim() : undefined,
      });

      setIsSaving(false);
      if (rpcError) {
        setError("Couldn't update that fault. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [],
  );

  /** Close `duplicateId` into `primaryId`, moving its confirmations across. */
  const mergeInto = useCallback(
    async (duplicateId: string, primaryId: string, note?: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("merge_fault_reports", {
        p_duplicate_id: duplicateId,
        p_primary_id: primaryId,
        p_note: note?.trim() ? note.trim() : undefined,
      });

      setIsSaving(false);
      if (rpcError) {
        setError("Couldn't merge those reports. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [],
  );

  return { setStatus, mergeInto, isSaving, error };
}
