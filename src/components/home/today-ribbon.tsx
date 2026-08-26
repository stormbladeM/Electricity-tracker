"use client";

import { SupplyRibbon } from "@/components/supply-ribbon/supply-ribbon";
import { SupplyRibbonSkeleton } from "@/components/supply-ribbon/supply-ribbon-skeleton";
import { useTodaySegments } from "./use-today-segments";

type TodayRibbonProps = {
  areaId: string | null | undefined;
  lgaName: string | null;
  /** Bump this after a successful log to refetch and pick up the transition. */
  refreshToken: number;
};

/**
 * Today's supply ribbon for the signed-in user's area, wired to live data.
 * SupplyRibbon detects an off→on transition itself — useRestorationSurge
 * compares segments across renders — so a successful log just needs to bump
 * refreshToken; there's no manual surge trigger here.
 */
export function TodayRibbon({ areaId, lgaName, refreshToken }: TodayRibbonProps) {
  const { segments, isLoading, error } = useTodaySegments(areaId, refreshToken);

  if (error) {
    return <p className="text-14 text-fault">{error}</p>;
  }

  if (isLoading || !segments) {
    return <SupplyRibbonSkeleton height={32} gapColor="var(--color-surface)" />;
  }

  return (
    <SupplyRibbon
      segments={segments}
      label={`Power in ${lgaName ?? "your area"} today`}
      height={32}
      gapColor="var(--color-surface)"
    />
  );
}
