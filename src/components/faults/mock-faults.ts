/**
 * Fixed fake faults for the /dev/faults component preview — the M5 counterpart
 * to supply-ribbon/mock-data.ts. Nothing here talks to Supabase.
 */
import type { FaultWithPlace } from "./fault-data";
import type { FaultSeverity, FaultStatus, FaultType } from "./fault-types";

const NOW = new Date("2026-08-27T14:37:00+01:00");

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 3_600_000).toISOString();
}

export function mockFault(overrides: Partial<FaultWithPlace> = {}): FaultWithPlace {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-0000000000aa",
    area_id: "00000000-0000-0000-0000-0000000000bb",
    lga_id: "00000000-0000-0000-0000-0000000000cc",
    state_id: "00000000-0000-0000-0000-0000000000dd",
    disco_id: null,
    fault_type: "transformer",
    description: "Loud bang from the transformer on Oba-Ile road, then the whole street went dark.",
    photo_url: null,
    latitude: null,
    longitude: null,
    severity: "high",
    status: "reported",
    confirm_count: 1,
    reported_at: hoursAgo(5),
    resolved_at: null,
    resolution_note: null,
    created_at: hoursAgo(5),
    updated_at: hoursAgo(5),
    lgas: { name: "Akure South", slug: "akure-south" },
    states: { name: "Ondo", slug: "ondo" },
    discos: { name: "Benin Electricity Distribution Company", short_name: "BEDC" },
    ...overrides,
  };
}

export const MOCK_FAULTS: FaultWithPlace[] = [
  mockFault({
    id: "10000000-0000-0000-0000-000000000001",
    fault_type: "transformer",
    severity: "critical",
    status: "in_progress",
    confirm_count: 9,
    latitude: 7.2526,
    longitude: 5.1931,
    reported_at: hoursAgo(30),
  }),
  mockFault({
    id: "10000000-0000-0000-0000-000000000002",
    fault_type: "cable_snap",
    severity: "high",
    status: "confirmed",
    confirm_count: 4,
    latitude: 7.2571,
    longitude: 5.2103,
    reported_at: hoursAgo(12),
  }),
  mockFault({
    id: "10000000-0000-0000-0000-000000000003",
    fault_type: "low_voltage",
    severity: "medium",
    status: "reported",
    confirm_count: 1,
    reported_at: hoursAgo(3),
  }),
  mockFault({
    id: "10000000-0000-0000-0000-000000000004",
    fault_type: "billing",
    severity: "low",
    status: "resolved",
    confirm_count: 2,
    resolved_at: hoursAgo(1),
    resolution_note: "DisCo reissued the bill at the metered rate.",
    reported_at: hoursAgo(72),
  }),
];

export const ALL_TYPES: FaultType[] = [
  "transformer",
  "pole_down",
  "cable_snap",
  "meter_issue",
  "low_voltage",
  "vandalism",
  "billing",
  "other",
];

export const ALL_SEVERITIES: FaultSeverity[] = ["low", "medium", "high", "critical"];

export const ALL_STATUSES: FaultStatus[] = [
  "reported",
  "confirmed",
  "acknowledged",
  "in_progress",
  "resolved",
  "rejected",
];
