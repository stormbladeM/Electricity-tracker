/**
 * The two hatch patterns. Both are "we can't tell you", drawn in --hairline so
 * they never compete with a lit segment, and both are textures rather than
 * shades so the meaning survives a colour-blind or low-contrast screen.
 *
 * They differ by hatch direction and density on purpose:
 *   no-data — a past hour nobody logged. Dense hatch rising over --off.
 *   unknown — a future hour. Sparser, dimmer hatch falling over --base.
 *
 * Neither can be mistaken for a solid --off segment, which is the point: an
 * unlit hour at 8pm tomorrow means "not known yet", not "no power".
 */
export type RibbonPatternIds = {
  noData: string;
  unknown: string;
};

export function ribbonPatternIds(instanceId: string): RibbonPatternIds {
  return {
    noData: `ribbon-no-data-${instanceId}`,
    unknown: `ribbon-unknown-${instanceId}`,
  };
}

export function RibbonDefs({ ids }: { ids: RibbonPatternIds }) {
  return (
    <defs>
      <pattern
        id={ids.noData}
        patternUnits="userSpaceOnUse"
        width={5}
        height={5}
        patternTransform="rotate(45)"
      >
        <rect width={5} height={5} fill="var(--color-off)" />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={5}
          stroke="var(--color-hairline)"
          strokeWidth={1.5}
        />
      </pattern>

      <pattern
        id={ids.unknown}
        patternUnits="userSpaceOnUse"
        width={7}
        height={7}
        patternTransform="rotate(-45)"
      >
        <rect width={7} height={7} fill="var(--color-base)" />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={7}
          stroke="var(--color-hairline)"
          strokeWidth={1}
          opacity={0.65}
        />
      </pattern>
    </defs>
  );
}
