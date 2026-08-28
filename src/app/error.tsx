"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The route-level error boundary. Kept deliberately plain: no stack trace, no
 * error code, just a way back and a retry. `reset()` re-renders the segment,
 * which recovers from a transient data-fetch failure without a full reload.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-16 text-center">
      <h1 className="font-display text-24 font-medium text-text">
        Something went wrong at our end.
      </h1>
      <p className="max-w-sm text-14 text-text-muted">
        The page didn&rsquo;t load. Try again in a moment.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-hairline px-4 py-3 text-16 text-text hover:border-text-muted"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
        >
          Go to the tracker
        </Link>
      </div>
    </main>
  );
}
