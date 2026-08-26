import Link from "next/link";

/**
 * Nothing is known about this window — no logs inside it, and no status
 * carried in from before it.
 *
 * This is the one case where the uptime formula has to be overruled rather
 * than reported: with no outages on record, (window − 0) ÷ window is 100%, and
 * showing perfect supply because nobody has said otherwise would be the most
 * misleading number on the screen.
 */
export function EmptyWindow({ areaName }: { areaName: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-hairline bg-surface p-4">
      <p className="text-16 text-text">
        No logs yet in {areaName}. Be the first to report.
      </p>
      <Link href="/" className="rounded text-14 text-primary-text underline underline-offset-4">
        Log power on the home screen
      </Link>
    </div>
  );
}
