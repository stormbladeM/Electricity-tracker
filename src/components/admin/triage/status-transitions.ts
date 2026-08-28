import type { FaultStatus } from "@/components/faults/fault-types";

/**
 * Where a report can go from where it is, and what to call the move.
 *
 * The buttons are named for the action, not the state — "Acknowledge", not
 * "Set status to acknowledged" — and an action keeps its name through the flow
 * (CLAUDE.md's copy rules). Listing the moves per status is what stops the
 * panel offering "Resolve" on something already resolved.
 *
 * Two statuses are missing on purpose. 'reported' is where a report starts and
 * nothing returns it there — a moderator has seen it by then, so reopening
 * lands on 'acknowledged'. 'confirmed' is only ever set by the 0005 trigger
 * when three contributors agree; a moderator saying "confirmed" would be
 * claiming an agreement that did not happen.
 */
export type StatusMove = {
  status: FaultStatus;
  label: string;
};

const ACKNOWLEDGE: StatusMove = { status: "acknowledged", label: "Acknowledge" };
const START: StatusMove = { status: "in_progress", label: "Mark in progress" };
const RESOLVE: StatusMove = { status: "resolved", label: "Resolve" };
const REJECT: StatusMove = { status: "rejected", label: "Reject" };
const REOPEN: StatusMove = { status: "acknowledged", label: "Reopen" };

export const NEXT_STATUSES: Record<FaultStatus, StatusMove[]> = {
  reported: [ACKNOWLEDGE, START, RESOLVE, REJECT],
  confirmed: [ACKNOWLEDGE, START, RESOLVE, REJECT],
  acknowledged: [START, RESOLVE, REJECT],
  in_progress: [RESOLVE, REJECT],
  resolved: [REOPEN],
  rejected: [REOPEN],
};

/** Resolving asks for a note; the others accept one. */
export function noteIsExpected(status: FaultStatus): boolean {
  return status === "resolved" || status === "rejected";
}
