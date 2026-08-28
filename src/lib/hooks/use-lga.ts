"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Lga = Tables<"lgas">;

/**
 * Looks up an LGA's name for display — profiles only store the id.
 *
 * The lookup runs after an `await` inside the effect so no setState call is
 * synchronous during the effect's render pass (react-hooks/set-state-in-effect).
 */
export function useLga(lgaId: string | null | undefined) {
  const [lga, setLga] = useState<Lga | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      if (!lgaId) {
        setLga(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from("lgas").select("*").eq("id", lgaId).maybeSingle();
      if (cancelled) return;
      setLga(data ?? null);
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lgaId]);

  return { lga, isLoading };
}
