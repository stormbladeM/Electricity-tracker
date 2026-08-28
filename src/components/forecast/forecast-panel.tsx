"use client";

import { useMemo, useState } from "react";
import { ChartEntry } from "@/components/personal-dashboard/chart-entry";
import { FORECAST_CONFIDENCE_LABEL } from "./baseline-forecast";
import { accuracySentence, calibrationSentence } from "./forecast-accuracy";
import { ForecastLegend, ForecastRibbons, ForecastRibbonsSkeleton } from "./forecast-ribbons";
import {
  DEFAULT_TREND_WINDOW,
  rollingAverage,
  trend as trendOf,
  type RollingWindow,
} from "./rolling-average";
import { TrendChart, TrendChartSkeleton } from "./trend-chart";
import { TrendWindowSelector } from "./trend-window-selector";
import { useForecast } from "./use-forecast";

/**
 * The M7 forecasting section: the pattern in words, the trend, and the week
 * ahead — in that order, because it runs from what is known toward what is
 * guessed and the reader should feel the ground get softer as they go.
 *
 * Every claim is followed by what it rests on. The sentences name their
 * window, the forecast carries its confidence grade and the count of hours it
 * can actually speak to, and the accuracy line reports how far off the same
 * model was on seven days it had never seen — including, when it happens, the
 * admission that it did no better than quoting the area's average. CLAUDE.md
 * decision 7 keeps ML out until there is volume; this section is what earns
 * that decision the right to be visible rather than merely defensible.
 */
export function ForecastPanel({
  areaIds,
  areaName,
}: {
  areaIds: string[];
  areaName: string;
}) {
  const { data, isLoading, error } = useForecast(areaIds, areaName);
  const [trendWindow, setTrendWindow] = useState<RollingWindow>(DEFAULT_TREND_WINDOW);

  // Folded here rather than in useForecast: which window the trend line
  // reads is UI state (see ForecastData.daily's comment), and refolding 35
  // points on a toggle click is too cheap to justify a second fetch path.
  const rolling = useMemo(
    () => (data ? rollingAverage(data.daily, trendWindow) : []),
    [data, trendWindow],
  );
  const trend = useMemo(
    () => (data ? trendOf(data.daily, trendWindow) : null),
    [data, trendWindow],
  );

  if (error) {
    return (
      <Section heading="The week ahead">
        <p className="text-14 text-fault">{error}</p>
      </Section>
    );
  }

  if (isLoading || !data) {
    return (
      <Section heading="The week ahead">
        <div className="flex flex-col gap-6">
          <TrendChartSkeleton />
          <ForecastRibbonsSkeleton />
        </div>
      </Section>
    );
  }

  if (!data.coverage.hasAnyKnowledge) {
    return (
      <Section heading="The week ahead">
        <p className="text-14 text-text-muted">
          No logs yet in {areaName}. A forecast needs a few weeks of reports to
          build on.
        </p>
      </Section>
    );
  }

  const accuracy = accuracySentence(data.accuracy);
  const calibration = calibrationSentence(data.accuracy);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-18 font-medium text-text">The usual week</h2>

        <div className="flex flex-col gap-3 rounded border border-hairline bg-surface p-4">
          {data.sentences.length > 0 ? (
            data.sentences.map((sentence) => (
              <p key={sentence} className="text-16 text-text">
                {sentence}
              </p>
            ))
          ) : (
            <p className="text-14 text-text-muted">
              Not enough logs yet to describe a weekly pattern in {areaName}. More
              reports will sharpen this.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-18 font-medium text-text">
              Getting better or worse
            </h2>
            <p className="text-14 text-text-muted">
              Availability each day, with a {trendWindow}-day average over it.
            </p>
          </div>
          <TrendWindowSelector window={trendWindow} onChange={setTrendWindow} />
        </div>

        <div className="rounded border border-hairline bg-surface p-4">
          <ChartEntry key={trendWindow}>
            <TrendChart points={rolling} windowDays={trendWindow} areaName={areaName} />
          </ChartEntry>

          {trend && (
            <p className="mt-4 border-t border-hairline pt-4 text-14 text-text-muted">
              {describeTrend(trend.change)} — {Math.round(trend.recent * 100)}%
              over the last {trendWindow} days, against{" "}
              {Math.round(trend.previous * 100)}% the {trendWindow} days before.
            </p>
          )}
        </div>
      </section>

      <Section heading="The week ahead">
        <div className="flex flex-col gap-4">
          <p className="text-12 uppercase tracking-wide text-text-muted">
            {FORECAST_CONFIDENCE_LABEL[data.confidence]}
          </p>

          {data.confidence === "none" ? (
            <p className="text-14 text-text-muted">
              {areaName} needs a few more weeks of reports before the same weekday
              and hour can be averaged into a forecast.
            </p>
          ) : (
            <>
              <ChartEntry>
                <ForecastRibbons days={data.forecast} areaName={areaName} />
              </ChartEntry>

              <div className="border-t border-hairline pt-4">
                <ForecastLegend />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 border-t border-hairline pt-4">
            <p className="text-12 text-text-muted">{data.basis}</p>
            {accuracy && <p className="text-12 text-text-muted">{accuracy}</p>}
            {calibration && <p className="text-12 text-text-muted">{calibration}</p>}
            <p className="text-12 text-text-muted">
              Each hour is the average of the same hour on the same weekday over the
              last four weeks. It knows nothing about maintenance schedules, weather
              or grid collapses.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

/** "Steadier than before" reads better than "+0 points" for a flat week. */
function describeTrend(change: number): string {
  const points = Math.round(Math.abs(change) * 100);
  if (points < 3) return "Holding steady";
  return change > 0 ? `Up ${points} points` : `Down ${points} points`;
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-18 font-medium text-text">{heading}</h2>
      <p className="text-14 text-text-muted">
        A baseline forecast from this area&apos;s own recent weeks.
      </p>
      <div className="rounded border border-hairline bg-surface p-4">{children}</div>
    </section>
  );
}
