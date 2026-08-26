"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Lga = Tables<"lgas">;

export function useLgas(stateId: string | null) {
  const [lgas, setLgas] = useState<Lga[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setLgas([]);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    supabase
      .from("lgas")
      .select("*")
      .eq("state_id", stateId)
      .order("name")
      .then(({ data }) => {
        setLgas(data ?? []);
        setIsLoading(false);
      });
  }, [stateId]);

  return { lgas, isLoading };
}
