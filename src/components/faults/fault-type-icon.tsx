import type { ReactNode } from "react";
import { Activity, Hammer, ReceiptText, TriangleAlert, type LucideIcon } from "lucide-react";
import {
  CableSnapIcon,
  MeterIcon,
  TransformerIcon,
  UtilityPoleIcon,
  type ElectricalIconProps,
} from "@/components/icons";
import type { FaultType } from "./fault-types";

type IconComponent = (props: ElectricalIconProps) => ReactNode;

/**
 * The icon for a fault type. Electrical concepts use the custom 1.5px-stroke
 * icons drawn in M4; the rest fall back to Lucide at the same stroke weight,
 * per docs/design-system.md ("only theme the icons that are literally about
 * electricity").
 */
const ICONS: Record<FaultType, IconComponent | LucideIcon> = {
  transformer: TransformerIcon,
  pole_down: UtilityPoleIcon,
  cable_snap: CableSnapIcon,
  meter_issue: MeterIcon,
  low_voltage: Activity,
  vandalism: Hammer,
  billing: ReceiptText,
  other: TriangleAlert,
};

export function FaultTypeIcon({
  type,
  size = 20,
  className,
}: {
  type: FaultType;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[type];
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}
