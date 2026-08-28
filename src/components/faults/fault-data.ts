/**
 * Shared shapes and the one select string for reading fault reports.
 *
 * Every fault query — the feed, "faults nearby", the map, the detail page —
 * wants the report plus its LGA and state name for display, so the column list
 * lives here once.
 */
import type { Tables } from "@/lib/supabase/database.types";

export type FaultReport = Tables<"fault_reports">;

/** A fault row plus the place names the UI shows next to it. */
export type FaultWithPlace = FaultReport & {
  lgas: { name: string; slug: string | null } | null;
  states: { name: string; slug: string | null } | null;
  discos: { name: string; short_name: string | null } | null;
};

export const FAULT_SELECT =
  "*, lgas(name, slug), states(name, slug), discos(name, short_name)";

/** Which denormalized column a fault list is scoped by. */
export type FaultScopeColumn = "area_id" | "lga_id" | "state_id";
