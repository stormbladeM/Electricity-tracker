import { ElectricalIcon, type ElectricalIconProps } from "./electrical-icon";

/** An electricity meter: a boxed dial with a needle and two terminals. */
export function MeterIcon(props: ElectricalIconProps) {
  return (
    <ElectricalIcon {...props}>
      <rect x="4" y="3" width="16" height="15" rx="2" />
      <circle cx="12" cy="10" r="4" />
      <path d="M12 10l2.2-1.8" />
      <path d="M9 21v-3" />
      <path d="M15 21v-3" />
    </ElectricalIcon>
  );
}
