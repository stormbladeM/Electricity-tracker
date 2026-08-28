"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ConfirmResult = { ok: true } | { ok: false; message: string };

/**
 * Add or remove the current user's "I'm affected too" confirmation for a fault.
 * The (fault_id, user_id) unique constraint from 0001 makes a double-tap a
 * no-op; fault_reports.confirm_count and the reported→confirmed promotion are
 * maintained by the trigger in migration 0005, so the caller just needs to
 * refetch the fault afterwards.
 */
export function useConfirmFault(faultId: string) {
  const [isPending, setIsPending] = useState(false);

  const setConfirmed = useCallback(
    async (userId: string, confirmed: boolean): Promise<ConfirmResult> => {
      setIsPending(true);
      const supabase = createClient();

      const { error } = confirmed
        ? await supabase
            .from("fault_confirmations")
            .insert({ fault_id: faultId, user_id: userId })
        : await supabase
            .from("fault_confirmations")
            .delete()
            .eq("fault_id", faultId)
            .eq("user_id", userId);

      setIsPending(false);

      // 23505 = unique violation: the confirmation already exists, so a
      // double-tap or a retried request is already in the state we wanted.
      if (error && error.code !== "23505") {
        return {
          ok: false,
          message: "Couldn't save that. Check your connection and try again.",
        };
      }
      return { ok: true };
    },
    [faultId],
  );

  return { setConfirmed, isPending };
}
