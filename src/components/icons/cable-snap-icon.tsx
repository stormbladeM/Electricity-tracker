import { ElectricalIcon, type ElectricalIconProps } from "./electrical-icon";

/** A snapped cable: two line ends pulling apart with a spark at the break. */
export function CableSnapIcon(props: ElectricalIconProps) {
  return (
    <ElectricalIcon {...props}>
      <path d="M3 7c3 0 5 2 7 3" />
      <path d="M21 17c-3 0-5-2-7-3" />
      <path d="M11 4l1.5 4-3 1.5L11 14" />
      <path d="M17 6l1.5 1.5" />
      <path d="M6 18l1.5-1.5" />
    </ElectricalIcon>
  );
}
