import Link from "next/link";
import { areaHref } from "./area-nav";
import { SCOPES, type Scope } from "./scope";
import type { AreaPeriod } from "./area-period";

/**
 * Your LGA / your state.
 *
 * Like the period toggle, the choice lives in the URL — `?scope=state` is
 * linkable and survives a refresh, so these are links, not buttons, and get
 * keyboard behaviour and the focus ring for free. The period is carried
 * across so switching scope doesn't reset the window.
 *
 * The active option is marked four ways — raised surface, heavier weight, a
 * `--primary` underline, aria-current — never by a solid `--primary` fill,
 * which fails contrast for the label and breaks the design system's neon
 * rules.
 */
type ScopeSelectorProps = {
  scope: Scope;
  period: AreaPeriod;
  lgaName: string;
  stateName: string;
};

export function ScopeSelector({ scope, period, lgaName, stateName }: ScopeSelectorProps) {
  const label: Record<Scope, string> = { lga: lgaName, state: stateName };

  return (
    <nav aria-label="Area level" className="flex rounded border border-hairline p-1">
      {SCOPES.map((option) => {
        const isActive = option === scope;

        return (
          <Link
            key={option}
            href={areaHref(option, period)}
            replace
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={`flex-1 truncate rounded border-b-2 px-3 py-2 text-center text-14 ${
              isActive
                ? "border-primary bg-surface font-medium text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {label[option]}
          </Link>
        );
      })}
    </nav>
  );
}
