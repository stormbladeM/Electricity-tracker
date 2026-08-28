"use client";

import { useMemo } from "react";
import { useAreaDayLogs } from "@/components/area-dashboard/use-area-window-logs";
import {
  baselineForecast,
  forecastBasis,
  forecastConfidence,
  FORECAST_HISTORY_DAYS,
  TRAINING_DAYS,
  type ForecastConfidence,
  type ForecastDay,
} from "./baseline-forecast";
import { backtest, type BacktestResult } from "./forecast-accuracy";
import {
  patternHighlights,
  patternSentences,
  type PatternHighlights,
} from "./pattern-summary";
import { dailyAvailability, type DailyAvailability } from "./rolling-average";
import { buildWeeklyPattern, type WeeklyPattern } from "./weekly-pattern";
import type { AreaCoverage } from "@/components/area-dashboard/area-confidence";

export type ForecastData = {
  /** The model, trained on the most recent four whole weeks. */
  pattern: WeeklyPattern;
  highlights: PatternHighlights;
  /** Phase 1 in words. Empty when nothing is supportable. */
  sentences: string[];
  /** Phase 2: the next seven days, hour by hour. */
  forecast: ForecastDay[];
  confidence: ForecastConfidence;
  basis: string;
  /** How the same model scored on the seven days held out of its training. */
  accuracy: BacktestResult;
  /**
   * One point per day, unwindowed. `ForecastPanel` folds this into a rolling
   * mean at whatever window the trend selector is set to — the choice of 7
   * vs 30 days is UI state, not data-fetching state, so it does not belong
   * in this hook.
   */
  daily: DailyAvailability[];
  coverage: AreaCoverage;
};

/**
 * Everything the forecast section shows, from one fetch.
 *
 * The window is five weeks: four to train on and one to score against. The
 * area dashboard's other surfaces read thirty days, so this is a separate
 * query rather than a reuse — the extra week is what makes the accuracy
 * figure honest, and a backtest scored on days the model trained on would be
 * worse than no backtest at all.
 *
 * The pattern is built from the most recent TRAINING_DAYS of that span, not
 * all of it, so the sentences, the ribbons and the accuracy figure all
 * describe the same model rather than three slightly different ones.
 */
export function useForecast(areaIds: string[], areaName: string) {
  const { data, isLoading, error } = useAreaDayLogs(areaIds, FORECAST_HISTORY_DAYS);

  const forecastData = useMemo<ForecastData | null>(() => {
    if (!data) return null;

    const pattern = buildWeeklyPattern(data.days.slice(-TRAINING_DAYS));
    const highlights = patternHighlights(pattern);
    // The grade reads the backtest, so the score has to exist first — a
    // forecast that beat nothing must not be labelled a confident one.
    const accuracy = backtest(data.days);

    return {
      pattern,
      highlights,
      sentences: patternSentences(highlights, areaName),
      forecast: baselineForecast(pattern, new Date()),
      confidence: forecastConfidence(pattern, accuracy),
      basis: forecastBasis(pattern),
      accuracy,
      daily: dailyAvailability(data.days),
      coverage: data.coverage,
    };
  }, [data, areaName]);

  return { data: forecastData, isLoading, error };
}
