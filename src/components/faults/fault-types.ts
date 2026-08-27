/**
 * Single source of truth for how each fault enum value is spoken and coloured.
 *
 * Every fault surface — the report form, the feed card, the detail page, the
 * map popup, the dev preview — reads its labels and treatment from here, so a
 * wording or colour change lands in one place. Keys mirror the enums in
 * database.types.ts exactly.
 */
import type { Enums } from "@/lib/supabase/database.types";

export type FaultType = Enums<"fault_type">;
export type FaultSeverity = Enums<"fault_severity">;
export type FaultStatus = Enums<"fault_status">;

export const FAULT_TYPES: readonly FaultType[] = [
  "transformer",
  "pole_down",
  "cable_snap",
  "meter_issue",
  "low_voltage",
  "vandalism",
  "billing",
  "other",
] as const;

type FaultTypeMeta = {
  /** Short noun for chips and titles. */
  label: string;
  /** One line of help under the option in the report form. */
  hint: string;
};

export const FAULT_TYPE_META: Record<FaultType, FaultTypeMeta> = {
  transformer: {
    label: "Transformer",
    hint: "A distribution transformer has blown, burnt or is sparking.",
  },
  pole_down: {
    label: "Pole down",
    hint: "A utility pole has fallen or is leaning dangerously.",
  },
  cable_snap: {
    label: "Snapped cable",
    hint: "A power line is down or hanging low.",
  },
  meter_issue: {
    label: "Meter issue",
    hint: "A prepaid or postpaid meter is faulty, blank or not vending.",
  },
  low_voltage: {
    label: "Low voltage",
    hint: "Power is on but too weak to run appliances.",
  },
  vandalism: {
    label: "Vandalism",
    hint: "Cables, a transformer or other equipment have been stolen or damaged.",
  },
  billing: {
    label: "Billing",
    hint: "A billing or estimated-charge problem, not a supply fault.",
  },
  other: {
    label: "Other",
    hint: "Something else worth reporting to neighbours and the DisCo.",
  },
};

export const FAULT_SEVERITIES: readonly FaultSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

type SeverityMeta = {
  label: string;
  /** Filled ticks out of 4 — the non-colour half of the encoding. */
  ticks: number;
  /** Tailwind text-colour class for the label and filled ticks. */
  tone: string;
  hint: string;
};

export const SEVERITY_META: Record<FaultSeverity, SeverityMeta> = {
  low: {
    label: "Low",
    ticks: 1,
    tone: "text-text-muted",
    hint: "Minor or localised. No safety risk.",
  },
  medium: {
    label: "Medium",
    ticks: 2,
    tone: "text-warn",
    hint: "Affects a street or block. Worth the DisCo knowing.",
  },
  high: {
    label: "High",
    ticks: 3,
    tone: "text-fault",
    hint: "Widespread outage or a likely safety hazard.",
  },
  critical: {
    label: "Critical",
    ticks: 4,
    tone: "text-fault",
    hint: "Immediate danger to life — live wire, fire, explosion.",
  },
};

type StatusMeta = {
  label: string;
  /** Whether the fault is still live — drives the feed and "faults nearby". */
  isOpen: boolean;
  /** Whether to draw the label in --fault (the edges of the lifecycle). */
  isAlarm: boolean;
  /** One line for the status timeline. */
  blurb: string;
};

export const FAULT_STATUS_META: Record<FaultStatus, StatusMeta> = {
  reported: {
    label: "Reported",
    isOpen: true,
    isAlarm: true,
    blurb: "Reported by a contributor. Waiting for neighbours to confirm.",
  },
  confirmed: {
    label: "Confirmed",
    isOpen: true,
    isAlarm: false,
    blurb: "Confirmed by three or more contributors in the area.",
  },
  acknowledged: {
    label: "Acknowledged",
    isOpen: true,
    isAlarm: false,
    blurb: "A moderator has seen this and passed it on.",
  },
  in_progress: {
    label: "In progress",
    isOpen: true,
    isAlarm: false,
    blurb: "Work is underway.",
  },
  resolved: {
    label: "Resolved",
    isOpen: false,
    isAlarm: false,
    blurb: "Marked resolved.",
  },
  rejected: {
    label: "Rejected",
    isOpen: false,
    isAlarm: true,
    blurb: "Closed without action — a duplicate or not a real fault.",
  },
};

/** The statuses a feed / "faults nearby" query should treat as active. */
export const OPEN_FAULT_STATUSES: FaultStatus[] = [
  "reported",
  "confirmed",
  "acknowledged",
  "in_progress",
];
