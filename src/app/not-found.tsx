import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-16 text-center">
      <p className="font-mono text-14 text-text-muted">404</p>
      <h1 className="font-display text-24 font-medium text-text">That page isn&rsquo;t here.</h1>
      <p className="max-w-sm text-14 text-text-muted">
        The link may be old, or the page may have moved.
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
