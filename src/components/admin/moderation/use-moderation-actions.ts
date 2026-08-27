"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The two moderation writes, both of them Postgres functions.
 *
 * Neither is a plain table update, on purpose: `review_power_logs` and
 * `set_user_moderation` (migration 0008) each apply the change *and* write the
 * audit rows in one transaction. An admin action that could land without its
 * audit row would make the trail a best-effort log rather than a record, so
 * the client is never given the chance to do half of it.
 */

export type AccountChange = {
  isBanned?: boolean;
  trustScore?: number;
  note?: string;
};

export function useModerationActions() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Keep (clear the flag) or reject (leave it out of every public figure). */
  const reviewLogs = useCallback(
    async (logIds: string[], keep: boolean, note?: string): Promise<boolean> => {
      if (logIds.length === 0) return true;

      setIsSaving(true);
      setError(null);

      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("review_power_logs", {
        p_log_ids: logIds,
        p_keep: keep,
        p_note: note?.trim() ? note.trim() : undefined,
      });

      setIsSaving(false);
      if (rpcError) {
        setError("Couldn't save that decision. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [],
  );

  /** Ban, unban, adjust trust, or record a note. Admin only server-side. */
  const moderateAccount = useCallback(
    async (userId: string, change: AccountChange): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("set_user_moderation", {
        p_user_id: userId,
        p_is_banned: change.isBanned,
        p_trust_score: change.trustScore,
        p_note: change.note?.trim() ? change.note.trim() : undefined,
      });

      setIsSaving(false);
      if (rpcError) {
        setError("Couldn't save that change. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [],
  );

  return { reviewLogs, moderateAccount, isSaving, error };
}
