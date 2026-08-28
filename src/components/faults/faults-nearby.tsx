"use client";

import Link from "next/link";
import { FaultCard } from "./fault-card";
import { useFaults } from "./use-faults";

/**
 * "Active faults nearby" for the home screen and the area dashboard. Renders
 * nothing at all when there are no open faults — an empty section on the home
 * screen would just be noise.
 */
export function FaultsNearby({
  areaId,
  lgaId,
  heading = "Active faults nearby",
  limit = 3,
}: {
  /** Pass one. areaId is the tightest scope (home screen); lgaId is wider. */
  areaId?: string | null;
  lgaId?: string | null;
  heading?: string;
  limit?: number;
}) {
  const column = areaId ? "area_id" : "lga_id";
  const value = areaId ?? lgaId;
  const { faults, isLoading } = useFaults({ column, value, limit });

  if (isLoading || !faults || faults.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-18 font-medium text-text">{heading}</h2>
        <Link href="/faults" className="rounded text-14 text-primary-text hover:underline">
          All faults
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {faults.map((fault) => (
          <FaultCard key={fault.id} fault={fault} compact />
        ))}
      </div>
    </section>
  );
}
