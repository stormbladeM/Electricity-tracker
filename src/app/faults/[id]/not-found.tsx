import Link from "next/link";

export default function FaultNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-base px-6 py-16 text-center">
      <h1 className="font-display text-24 font-medium text-text">
        This fault report doesn&rsquo;t exist.
      </h1>
      <p className="max-w-sm text-14 text-text-muted">
        It may have been merged into another report or removed by a moderator.
      </p>
      <Link
        href="/faults"
        className="rounded bg-primary px-4 py-3 text-16 font-medium text-text"
      >
        See open faults
      </Link>
    </main>
  );
}
