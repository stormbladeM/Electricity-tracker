"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminWindow } from "../ui/admin-window";
import { filterPrefix, type AuditFilter } from "./audit-actions";

export type AuditEntry =
  Database["public"]["Functions"]["admin_audit_feed"]["Returns"][number];

const FEED_LIMIT = 200;

/**
 * The audit trail for one window and one action family.
 *
 * A function rather than a select on admin_audit_log, for the one thing the
 * table cannot do on its own: admin_id references auth.users, so there is no
 * foreign key for PostgREST to resolve a name through, and a trail of bare
 * UUIDs is not a trail anybody reads.
 */
export function useAuditFeed(days: AdminWindow, filter: AuditFilter) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("admin_audit_feed", {
        p_limit: FEED_LIMIT,
        p_days: days,
        p_action_prefix: filterPrefix(filter),
      });

      if (cancelled) return;

      if (rpcError) {
        setError("Couldn't load the audit log. Check your connection and try again.");
      } else {
        setEntries(data ?? []);
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days, filter]);

  return { entries, isLoading, error };
}
