"use client";

import { SupplyRibbon, type SupplyRibbonProps } from "./supply-ribbon";

type RibbonRowProps = SupplyRibbonProps & {
  /** Row label — a day ("Mon 24") or an area name ("Akure South"). */
  rowLabel: string;
  /** Width of the label column, any CSS length. */
  labelWidth?: string;
};

/**
 * A ribbon with a label beside it. Stack these in a column and you have the
 * week view, the month barcode and the LGA comparison — the label is the only
 * thing that differs between them.
 */
export function RibbonRow({
  rowLabel,
  labelWidth = "5rem",
  ...ribbonProps
}: RibbonRowProps) {
  return (
    <div
      className="grid items-center gap-3"
      style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)` }}
    >
      <span className="truncate font-mono text-12 text-text-muted">{rowLabel}</span>
      <SupplyRibbon {...ribbonProps} />
    </div>
  );
}
