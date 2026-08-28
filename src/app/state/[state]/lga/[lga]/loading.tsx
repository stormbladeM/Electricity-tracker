/**
 * Shown while the server builds a public area page (hourly-revalidated, but the
 * first request for an un-cached LGA still waits on the query). Mirrors the
 * frame in the page so nothing jumps when it resolves.
 */
export default function LoadingArea() {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6" aria-busy="true">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-surface" />
          <div className="h-8 w-1/2 animate-pulse rounded bg-surface" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface" />
        </div>
        <div className="h-32 w-full animate-pulse rounded border border-hairline bg-surface" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded border border-hairline bg-surface" />
          <div className="h-20 animate-pulse rounded border border-hairline bg-surface" />
        </div>
        <div className="h-64 w-full animate-pulse rounded border border-hairline bg-surface" />
      </div>
    </main>
  );
}
