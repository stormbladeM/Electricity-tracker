"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The read shape every admin table uses: fetch, cancel on unmount, one error
 * string, and a refetch to call after a write.
 *
 * The user app's hooks each write this out because each one does something
 * slightly different with its data. The admin panel's don't — a queue, a
 * contributor list, an LGA list and a DisCo list are all "run this query, show
 * the rows, run it again after I change something" — so the loop lives here
 * once and the hooks above it are three lines of query.
 *
 * `query` must be memoised by its caller (a `useCallback` with the real
 * dependencies); it is the effect's dependency, so an inline arrow would
 * re-fetch on every render.
 */
export type RowsResult<Row> = { data: Row[] | null; error: { message: string } | null };

export function useAdminRows<Row>(
  query: () => Promise<RowsResult<Row>>,
  errorMessage: string,
) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await query();
      if (cancelled) return;

      if (queryError) {
        setError(errorMessage);
      } else {
        setRows(data ?? []);
      }
      setIsLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, errorMessage, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { rows, isLoading, error, refetch };
}
