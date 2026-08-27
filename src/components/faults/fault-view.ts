/**
 * The /faults screen state that lives in the URL, so a view is linkable and the
 * back button steps through it — same approach as the area dashboard's scope
 * and period params.
 */
export const FAULT_VIEWS = ["list", "map"] as const;
export type FaultViewMode = (typeof FAULT_VIEWS)[number];
export const DEFAULT_FAULT_VIEW: FaultViewMode = "list";

export const FAULT_SCOPES = ["lga", "state"] as const;
export type FaultScope = (typeof FAULT_SCOPES)[number];
export const DEFAULT_FAULT_SCOPE: FaultScope = "lga";

function pick<T extends readonly string[]>(
  options: T,
  fallback: T[number],
  value: string | string[] | undefined,
): T[number] {
  const candidate = Array.isArray(value) ? value[0] : value;
  return options.find((option) => option === candidate) ?? fallback;
}

export function parseFaultView(value: string | string[] | undefined): FaultViewMode {
  return pick(FAULT_VIEWS, DEFAULT_FAULT_VIEW, value);
}

export function parseFaultScope(value: string | string[] | undefined): FaultScope {
  return pick(FAULT_SCOPES, DEFAULT_FAULT_SCOPE, value);
}

/** The canonical /faults URL for a scope + view pair. */
export function faultsHref(scope: FaultScope, view: FaultViewMode): string {
  return `/faults?scope=${scope}&view=${view}`;
}
