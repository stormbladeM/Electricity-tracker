/**
 * What each audit action is called in the interface, and how the trail is
 * filtered.
 *
 * The action strings are namespaced (`log.`, `user.`, `fault.`, `location.`)
 * because that is the axis somebody searching the trail actually thinks along
 * — "what happened to faults last week" — so the filter is a prefix rather
 * than a list of eighteen exact actions.
 *
 * An unknown action falls back to its raw string rather than to "Unknown
 * action". A trail that quietly relabels what it does not recognise is worse
 * than one that shows you the identifier and lets you go and look.
 */
export const AUDIT_FILTERS = ["all", "log", "user", "fault", "location"] as const;
export type AuditFilter = (typeof AUDIT_FILTERS)[number];
export const DEFAULT_AUDIT_FILTER: AuditFilter = "all";

export const AUDIT_FILTER_LABEL: Record<AuditFilter, string> = {
  all: "Everything",
  log: "Logs",
  user: "Accounts",
  fault: "Faults",
  location: "Locations",
};

export function parseAuditFilter(value: string | string[] | undefined): AuditFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return AUDIT_FILTERS.find((filter) => filter === candidate) ?? DEFAULT_AUDIT_FILTER;
}

/** The `like` prefix the Postgres function takes; null means no filter. */
export function filterPrefix(filter: AuditFilter): string | undefined {
  return filter === "all" ? undefined : `${filter}.`;
}

const ACTION_LABEL: Record<string, string> = {
  "log.keep": "Kept a flagged log",
  "log.reject": "Rejected a flagged log",
  "user.ban": "Banned an account",
  "user.unban": "Lifted a ban",
  "user.trust_score": "Changed a trust score",
  "user.note": "Recorded a note on an account",
  "fault.status": "Changed a fault's status",
  "fault.merge": "Merged a duplicate fault",
  "location.state.create": "Added a state",
  "location.state.update": "Edited a state",
  "location.lga.create": "Added an LGA",
  "location.lga.update": "Edited an LGA",
  "location.disco.create": "Added a DisCo",
  "location.disco.update": "Edited a DisCo",
  "location.area.create": "Added an area",
  "location.area.update": "Edited an area",
  "location.area.merge": "Merged an area",
};

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** Only fault reports have a page to link a trail entry to. */
export function targetHref(targetType: string | null, targetId: string | null): string | null {
  return targetType === "fault_report" && targetId ? `/faults/${targetId}` : null;
}
