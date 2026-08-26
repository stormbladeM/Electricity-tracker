import Link from "next/link";
import { PERIODS, PERIOD_LABELS, type Period } from "./period";

/**
 * Today / 7 days / 30 days.
 *
 * The selection lives in the URL, not in component state: `?period=weekly` is
 * linkable, survives a refresh and gives the back button something to do. That
 * makes these real links rather than buttons — they work before hydration, and
 * they get the focus ring and keyboard behaviour for free.
 *
 * `replace` keeps a browsing session from filling up with one history entry per
 * toggle; `scroll={false}` leaves the reader where they were on the page.
 *
 * The selected option is marked four ways — raised surface, heavier weight, a
 * `--primary` rule under it, and aria-current — rather than by filling it with
 * `--primary`. Body text on that fill lands around 3.8:1, under AA, and a solid
 * block of it is the large neon fill the design system rules out.
 */
export function PeriodSelector({ period }: { period: Period }) {
  return (
    <nav aria-label="Time period" className="flex rounded border border-hairline p-1">
      {PERIODS.map((option) => {
        const isActive = option === period;

        return (
          <Link
            key={option}
            href={`/dashboard?period=${option}`}
            replace
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`flex-1 rounded border-b-2 px-3 py-2 text-center text-14 ${
              isActive
                ? "border-primary bg-surface font-medium text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {PERIOD_LABELS[option]}
          </Link>
        );
      })}
    </nav>
  );
}
