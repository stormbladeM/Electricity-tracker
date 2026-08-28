import { ElectricalIcon, type ElectricalIconProps } from "./electrical-icon";

/** A utility pole: post, crossarm, two insulators and a guy wire. */
export function UtilityPoleIcon(props: ElectricalIconProps) {
  return (
    <ElectricalIcon {...props}>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M9 5v2" />
      <path d="M15 5v2" />
      <path d="M12 10l6 4" />
      <path d="M12 10L6 14" />
    </ElectricalIcon>
  );
}
