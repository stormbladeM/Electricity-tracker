import { formatDate } from "@/components/supply-ribbon/format";

/**
 * One metric per day as a column chart — logs, new users, faults reported.
 *
 * Drawn as SVG rects for the same reason the ribbon is: it is a few dozen
 * plain rectangles, and a charting library would cost more in bundle than the
 * whole screen. Three of these side by side is the overview's growth section;
 * the component takes one series so the three stay identical in every respect
 * but their numbers.
 *
 * A day with no activity is drawn as a 2-unit stub in `--hairline`, not as
 * nothing: a gap in the row has to read as "nobody logged that day", which is
 * a real and interesting fact, rather than as a rendering hole.
 */
const BAR_SLOT = 10;
const BAR_WIDTH = 7;
const CHART_HEIGHT = 100;
const EMPTY_STUB = 2;

export type GrowthPointView = {
  /** ISO calendar day, e.g. "2026-08-14". */
  day: string;
  value: number;
};

export type GrowthTone = "series-1" | "series-2" | "fault";

const TONE_FILL: Record<GrowthTone, string> = {
  "series-1": "var(--color-series-1)",
  "series-2": "var(--color-series-2)",
  fault: "var(--color-fault)",
};

/**
 * The series `day` is a bare calendar date. `new Date("2026-08-14")` would
 * read it as UTC midnight and shift it a day back for anyone west of the
 * meridian, so the parts are read out and rebuilt as a local date.
 */
function parseIsoDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** "14 Aug" — the axis ends, where the year is noise. */
function shortDay(day: string): string {
  const date = parseIsoDay(day);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function GrowthChart({
  label,
  noun,
  points,
  tone,
}: {
  label: string;
  /** Plural noun for the spoken summary, e.g. "logs". */
  noun: string;
  points: GrowthPointView[];
  tone: GrowthTone;
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce(
    (best, point) => (point.value > best.value ? point : best),
    points[0] ?? { day: "", value: 0 },
  );
  const scale = Math.max(peak.value, 1);
  const quietDays = points.filter((point) => point.value === 0).length;

  const summary =
    `${label}: ${total} ${noun} over ${points.length} days. ` +
    (peak.value > 0
      ? `Busiest day ${formatDate(parseIsoDay(peak.day))} with ${peak.value}. `
      : "") +
    (quietDays > 0 ? `${quietDays} ${quietDays === 1 ? "day" : "days"} with none.` : "");

  return (
    <div className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-12 uppercase tracking-wide text-text-muted">{label}</p>
        <p className="font-mono text-14 font-medium text-text">{total.toLocaleString()}</p>
      </div>

      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${Math.max(points.length, 1) * BAR_SLOT} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
      >
        {points.map((point, index) => {
          const isEmpty = point.value === 0;
          const height = isEmpty
            ? EMPTY_STUB
            : Math.max(EMPTY_STUB, (point.value / scale) * (CHART_HEIGHT - 2));

          return (
            <rect
              key={point.day}
              x={index * BAR_SLOT + (BAR_SLOT - BAR_WIDTH) / 2}
              y={CHART_HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
              fill={isEmpty ? "var(--color-hairline)" : TONE_FILL[tone]}
            >
              <title>{`${formatDate(parseIsoDay(point.day))}: ${point.value} ${noun}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex justify-between font-mono text-12 text-text-muted">
        <span>{points.length > 0 ? shortDay(points[0].day) : ""}</span>
        <span>{points.length > 0 ? shortDay(points[points.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

export function GrowthChartSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded border border-hairline bg-surface p-3"
      aria-hidden="true"
    >
      <div className="h-3 w-20 animate-pulse rounded bg-hairline" />
      <div className="h-16 w-full animate-pulse rounded bg-hairline" />
      <div className="h-3 w-full animate-pulse rounded bg-hairline" />
    </div>
  );
}
