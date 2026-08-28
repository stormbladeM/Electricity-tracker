"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type PowerStatus = Enums<"power_status">;

/**
 * This signed-in user's own most recent status log for an area.
 *
 * Deliberately separate from useLatestLog (the area's latest log from any
 * contributor, which drives the status card and the button label): the
 * duplicate guard must check against this user's own last report, not the
 * area's, or a second person confirming the same status — valid
 * corroborating data — would get wrongly blocked.
 *
 * The query always runs after an `await`, so no setState call happens
 * synchronously during the effect's render pass (react-hooks/set-state-in-effect).
 */
export function useMyLatestStatus(areaId: string | null | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<PowerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!areaId || !userId) {
        setStatus(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("power_logs")
        .select("status")
        .eq("area_id", areaId)
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setStatus(data?.status ?? null);
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [areaId, userId, refreshToken]);

  return {
    status,
    isLoading,
    markLogged: (nextStatus: PowerStatus) => setStatus(nextStatus),
    refetch: () => setRefreshToken((token) => token + 1),
  };
}
