import Link from "next/link";

export default function AreaNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-16 text-center">
      <h1 className="font-display text-24 font-medium text-text">
        We don&rsquo;t have a page for that area.
      </h1>
      <p className="max-w-sm text-14 text-text-muted">
        Check the state and LGA in the address, or start from the tracker.
      </p>
      <Link
        href="/"
        className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
      >
        Go to the tracker
      </Link>
    </main>
  );
}
