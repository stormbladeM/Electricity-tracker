import type { SVGProps } from "react";

/**
 * The base for the custom electrical icons Lucide doesn't carry — meter,
 * transformer, utility pole, cable snap (CLAUDE.md: "Match Lucide's 1.5px
 * stroke exactly").
 *
 * Same call shape as a Lucide icon (`size`, `strokeWidth`, plus any SVG
 * prop), same 24×24 grid, same stroke settings, so these drop in beside
 * Lucide icons without looking foreign. Non-electrical UI still uses Lucide
 * unchanged — a gear stays a gear.
 */
export type ElectricalIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
  strokeWidth?: number;
};

export function ElectricalIcon({
  size = 24,
  strokeWidth = 1.5,
  children,
  ...props
}: ElectricalIconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
