import { ElectricalIcon, type ElectricalIconProps } from "./electrical-icon";

/** A distribution transformer: two windings on a common core, mounted. */
export function TransformerIcon(props: ElectricalIconProps) {
  return (
    <ElectricalIcon {...props}>
      <rect x="4" y="6" width="6" height="10" rx="1.5" />
      <rect x="14" y="6" width="6" height="10" rx="1.5" />
      <path d="M10 9h4" />
      <path d="M10 13h4" />
      <path d="M7 6V3" />
      <path d="M17 6V3" />
      <path d="M6 16v3h12v-3" />
    </ElectricalIcon>
  );
}
