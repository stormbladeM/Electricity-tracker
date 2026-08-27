import Link from "next/link";
import {
  FAULT_SCOPES,
  FAULT_VIEWS,
  faultsHref,
  type FaultScope,
  type FaultViewMode,
} from "./fault-view";

/**
 * The two /faults toggles — area level (LGA / state) and view (List / Map).
 * Both live in the URL, so these are links; the other param is carried across
 * so one toggle never resets the other. Active state is marked by a raised
 * surface, weight, an underline and aria-current — never a solid --primary fill
 * (design-system neon rules), matching the area dashboard's ScopeSelector.
 */
export function FaultsToggle({
  scope,
  view,
  lgaName,
  stateName,
}: {
  scope: FaultScope;
  view: FaultViewMode;
  lgaName: string;
  stateName: string;
}) {
  const scopeLabel: Record<FaultScope, string> = { lga: lgaName, state: stateName };
  const viewLabel: Record<FaultViewMode, string> = { list: "List", map: "Map" };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <nav aria-label="Area level" className="flex flex-1 rounded border border-hairline p-1">
        {FAULT_SCOPES.map((option) => (
          <Link
            key={option}
            href={faultsHref(option, view)}
            replace
            scroll={false}
            aria-current={option === scope ? "true" : undefined}
            className={`flex-1 truncate rounded border-b-2 px-3 py-2 text-center text-14 ${
              option === scope
                ? "border-primary bg-surface font-medium text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {scopeLabel[option]}
          </Link>
        ))}
      </nav>
      <nav aria-label="View" className="flex rounded border border-hairline p-1">
        {FAULT_VIEWS.map((option) => (
          <Link
            key={option}
            href={faultsHref(scope, option)}
            replace
            scroll={false}
            aria-current={option === view ? "true" : undefined}
            className={`rounded border-b-2 px-4 py-2 text-center text-14 ${
              option === view
                ? "border-primary bg-surface font-medium text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {viewLabel[option]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
