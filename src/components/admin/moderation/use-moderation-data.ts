"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { useAdminRows } from "../ui/use-admin-rows";

export type FlaggedLog =
  Database["public"]["Functions"]["admin_flagged_logs"]["Returns"][number];

export type Contributor =
  Database["public"]["Functions"]["admin_contributors"]["Returns"][number];

const QUEUE_LIMIT = 200;
const CONTRIBUTOR_LIMIT = 100;

/**
 * The moderation queue: flagged, undecided logs, newest first.
 *
 * Both reads on this screen go through Postgres functions (migration 0008)
 * rather than PostgREST selects, because power_logs.user_id points at
 * auth.users, not profiles — there is no foreign key for an embed to travel
 * along, and a moderator needs the contributor beside the log to decide
 * anything about it.
 */
export function useFlaggedLogs() {
  return useAdminRows<FlaggedLog>(
    useCallback(async () => {
      const supabase = createClient();
      return supabase.rpc("admin_flagged_logs", { p_limit: QUEUE_LIMIT });
    }, []),
    "Couldn't load the moderation queue. Check your connection and try again.",
  );
}

/** Accounts with a footprint, worst first — the contributors tab. */
export function useContributors(flaggedOnly: boolean) {
  return useAdminRows<Contributor>(
    useCallback(async () => {
      const supabase = createClient();
      return supabase.rpc("admin_contributors", {
        p_limit: CONTRIBUTOR_LIMIT,
        p_flagged_only: flaggedOnly,
      });
    }, [flaggedOnly]),
    "Couldn't load contributors. Check your connection and try again.",
  );
}
