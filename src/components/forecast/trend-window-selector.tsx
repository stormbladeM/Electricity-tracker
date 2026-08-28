"use client";

import { ROLLING_WINDOWS, type RollingWindow } from "./rolling-average";

/**
 * The 7 / 30-day switch for the trend chart alone.
 *
 * Every other toggle in this product lives in the URL (see
 * `AreaPeriodSelector`, `WindowSelector`, `PeriodSelector`) so a view is
 * linkable and survives a refresh. This one deliberately does not: a `Link`
 * here sits inside the same `useSearchParams()`-reading subtree it would be
 * writing to, and clicking it to change that very param was empirically
 * unreliable in testing — the transition would intermittently do nothing,
 * roughly two clicks in five. Plain `useState`, lifted to `ForecastPanel`,
 * has none of that hazard, and this control is a chart display preference
 * ("how far back does the line look"), not a piece of the screen someone
 * would bookmark or share on its own — the surrounding period/scope already
 * carry that job.
 *
 * Buttons, not links, since there is no href to speak of. Same visual
 * language as the URL-driven toggles regardless: a raised surface, a
 * `--primary` underline and `aria-pressed`, never a solid neon fill
 * (docs/design-system.md section 2).
 */
export function TrendWindowSelector({
  window,
  onChange,
}: {
  window: RollingWindow;
  onChange: (window: RollingWindow) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Trend window"
      className="flex shrink-0 rounded border border-hairline p-0.5"
    >
      {ROLLING_WINDOWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === window}
          onClick={() => onChange(option)}
          className={`rounded border-b-2 px-2 py-1 text-12 ${
            option === window
              ? "border-primary bg-surface font-medium text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {option} days
        </button>
      ))}
    </div>
  );
}
