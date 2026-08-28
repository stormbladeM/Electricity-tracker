import type { FaultStatus } from "@/components/faults/fault-types";

/**
 * The triage screen's tabs, held in the URL.
 *
 * The lifecycle has six statuses but triage only has three questions: what has
 * nobody looked at, what is being worked, and what is finished. Grouping them
 * that way is what makes the queue a queue — a moderator opens "Untriaged" and
 * empties it.
 *
 * Metrics sits alongside as a fourth tab rather than under the table: "how
 * long does a DisCo take to fix things" is a different job from working the
 * queue, and mixing them makes both harder to read.
 */
export const TRIAGE_TABS = ["untriaged", "open", "closed", "metrics"] as const;
export type TriageTab = (typeof TRIAGE_TABS)[number];
export const DEFAULT_TRIAGE_TAB: TriageTab = "untriaged";

export const TRIAGE_TAB_LABEL: Record<TriageTab, string> = {
  untriaged: "Untriaged",
  open: "Being worked",
  closed: "Closed",
  metrics: "Resolution metrics",
};

/** Which statuses each queue tab covers. Metrics has no status filter. */
export const TRIAGE_TAB_STATUSES: Record<
  Exclude<TriageTab, "metrics">,
  FaultStatus[]
> = {
  untriaged: ["reported", "confirmed"],
  open: ["acknowledged", "in_progress"],
  closed: ["resolved", "rejected"],
};

export const TRIAGE_TAB_BLURB: Record<TriageTab, string> = {
  untriaged: "Reported or confirmed by contributors, not yet picked up.",
  open: "Acknowledged or being worked on.",
  closed: "Resolved or rejected.",
  metrics: "Fault load and time to resolution, by DisCo and by state.",
};

export function parseTriageTab(value: string | string[] | undefined): TriageTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return TRIAGE_TABS.find((tab) => tab === candidate) ?? DEFAULT_TRIAGE_TAB;
}

export function triageHref(tab: TriageTab): string {
  return `/admin/faults?tab=${tab}`;
}
