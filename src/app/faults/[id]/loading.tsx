/**
 * Shown while the server fetches the fault for the first paint. Mirrors the
 * frame in fault-detail.tsx so the layout doesn't jump when the data lands.
 */
export default function LoadingFault() {
  return (
    <main className="flex-1 bg-base px-4 py-10 sm:px-6" aria-busy="true">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="h-4 w-16 animate-pulse rounded bg-surface" />
        <div className="flex flex-col gap-3">
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface" />
        </div>
        <div className="h-24 w-full animate-pulse rounded border border-hairline bg-surface" />
        <div className="h-40 w-full animate-pulse rounded border border-hairline bg-surface" />
      </div>
    </main>
  );
}
