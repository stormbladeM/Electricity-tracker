"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/use-auth";
import { FAULT_SELECT, type FaultWithPlace } from "./fault-data";

type FaultView = {
  fault: FaultWithPlace;
  /** The signed-in user reported this fault. */
  isOwner: boolean;
  /** The signed-in user has already confirmed it. */
  hasConfirmed: boolean;
};

/**
 * One fault by id, plus whether the current user owns it or has confirmed it —
 * everything the detail page and the confirm button need. `refetch` picks up
 * the trigger-updated confirm_count/status after a confirmation
 * (supabase/migrations/0005).
 */
export function useFault(id: string, initial?: FaultWithPlace) {
  const { user } = useAuth();
  const [data, setData] = useState<FaultView | null>(
    initial ? { fault: initial, isOwner: false, hasConfirmed: false } : null,
  );
  const [isLoading, setIsLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      const [faultRes, confirmRes] = await Promise.all([
        supabase.from("fault_reports").select(FAULT_SELECT).eq("id", id).maybeSingle(),
        user
          ? supabase
              .from("fault_confirmations")
              .select("id")
              .eq("fault_id", id)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      if (faultRes.error || !faultRes.data) {
        setError("Couldn't load this fault. Check your connection and try again.");
        setIsLoading(false);
        return;
      }

      const fault = faultRes.data as unknown as FaultWithPlace;
      setData({
        fault,
        isOwner: user?.id === fault.user_id,
        hasConfirmed: Boolean(confirmRes.data),
      });
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id, user, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((t) => t + 1), []);

  return { ...(data ?? { fault: null, isOwner: false, hasConfirmed: false }), isLoading, error, refetch };
}
