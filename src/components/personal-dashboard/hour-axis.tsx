/**
 * Hour marks under the daily ribbon, every six hours.
 *
 * Each label is positioned at the left edge of the hour it names, so "12:00"
 * sits where that segment begins; the closing mark is pinned right, where the
 * day ends. Percentages keep the marks aligned with the segments at any width,
 * since the ribbon is laid out in percentages too.
 */
const MARKS = [0, 6, 12, 18];

function label(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function HourAxis() {
  return (
    <div className="relative mt-2 h-4" aria-hidden="true">
      {MARKS.map((hour) => (
        <span
          key={hour}
          className="absolute top-0 font-mono text-12 text-text-muted"
          style={{ left: `${(hour / 24) * 100}%` }}
        >
          {label(hour)}
        </span>
      ))}
      <span className="absolute top-0 right-0 font-mono text-12 text-text-muted">
        {label(24)}
      </span>
    </div>
  );
}
