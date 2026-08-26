"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type State = Tables<"states">;

export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("states")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setStates(data ?? []);
        setIsLoading(false);
      });
  }, []);

  return { states, isLoading };
}
