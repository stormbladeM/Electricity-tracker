/**
 * The loading state for any ribbon — skeleton ribbons in --surface, never a
 * spinner (docs/design-system.md section 6). Static on purpose: motion in this
 * product is reserved for power restoration.
 */
export function SupplyRibbonSkeleton({
  segmentCount = 24,
  height = 28,
  gap = 2,
  gapColor = "var(--color-base)",
  className,
}: {
  segmentCount?: number;
  height?: number;
  gap?: number;
  gapColor?: string;
  className?: string;
}) {
  const cellWidth = 100 / segmentCount;

  return (
    <svg
      role="img"
      aria-label="Loading supply data"
      width="100%"
      height={height}
      style={{ height }}
      className={`block w-full ${className ?? ""}`}
    >
      <rect x={0} y={0} width="100%" height="100%" fill="var(--color-surface)" />
      {Array.from({ length: segmentCount - 1 }, (_, index) => (
        <rect
          key={index}
          x={`${((index + 1) * cellWidth).toFixed(4)}%`}
          y={0}
          width={gap}
          height="100%"
          transform={`translate(${-gap / 2},0)`}
          fill={gapColor}
        />
      ))}
    </svg>
  );
}
