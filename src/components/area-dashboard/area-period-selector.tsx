import Link from "next/link";
import { areaHref } from "./area-nav";
import { AREA_PERIODS, AREA_PERIOD_LABELS, type AreaPeriod } from "./area-period";
import type { Scope } from "./scope";

/**
 * Today / 7 days / 30 days / 12 months.
 *
 * URL-driven for the same reasons as the personal dashboard's toggle; the
 * scope is carried across so changing the window keeps you on the same LGA
 * or state.
 */
export function AreaPeriodSelector({
  period,
  scope,
}: {
  period: AreaPeriod;
  scope: Scope;
}) {
  return (
    <nav aria-label="Time period" className="flex rounded border border-hairline p-1">
      {AREA_PERIODS.map((option) => {
        const isActive = option === period;

        return (
          <Link
            key={option}
            href={areaHref(scope, option)}
            replace
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`flex-1 rounded border-b-2 px-2 py-2 text-center text-14 ${
              isActive
                ? "border-primary bg-surface font-medium text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {AREA_PERIOD_LABELS[option]}
          </Link>
        );
      })}
    </nav>
  );
}
