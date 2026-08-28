/**
 * Fake supply data for the ribbon preview at /dev/ribbon.
 *
 * M1 builds the ribbon in isolation, so nothing here touches Supabase. The
 * generators are seeded and the reference "now" is a fixed wall clock, so the
 * preview renders identically on every reload and in screenshots. Dates are
 * built and read in local time, which keeps server and client markup in
 * agreement whatever timezone either sits in.
 */
import { formatDayLabel } from "./format";
import { slicedSegment } from "./segment";
import type { RibbonSegment, SegmentSlice } from "./types";

/** Wednesday 26 August 2026, 14:37 — the moment the preview pretends it is. */
export const MOCK_NOW = new Date(2026, 7, 26, 14, 37);

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

type Transition = { minute: number; on: boolean };

/** How a given area's supply behaves, in minutes. */
type SupplyProfile = {
  startsOnChance: number;
  onRange: [number, number];
  offRange: [number, number];
  /** Chance a past hour has no logs at all — sparse coverage. */
  noDataChance: number;
};

export const SUPPLY_PROFILES = {
  reliable: {
    startsOnChance: 0.85,
    onRange: [180, 600],
    offRange: [30, 150],
    noDataChance: 0.02,
  },
  mixed: {
    startsOnChance: 0.6,
    onRange: [90, 320],
    offRange: [60, 260],
    noDataChance: 0.05,
  },
  poor: {
    startsOnChance: 0.3,
    onRange: [40, 160],
    offRange: [120, 420],
    noDataChance: 0.08,
  },
  sparse: {
    startsOnChance: 0.5,
    onRange: [60, 240],
    offRange: [90, 300],
    noDataChance: 0.4,
  },
} satisfies Record<string, SupplyProfile>;

export type SupplyProfileName = keyof typeof SUPPLY_PROFILES;

export type MockRibbonRow = {
  key: string;
  label: string;
  segments: RibbonSegment[];
};

/** Small deterministic PRNG — same seed, same ribbon, every render. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function buildTimeline(random: () => number, profile: SupplyProfile): Transition[] {
  const timeline: Transition[] = [
    { minute: 0, on: random() < profile.startsOnChance },
  ];
  let minute = 0;

  while (minute < MINUTES_PER_DAY) {
    const isOn = timeline[timeline.length - 1].on;
    const [min, max] = isOn ? profile.onRange : profile.offRange;
    minute += randomInt(random, min, max);
    if (minute >= MINUTES_PER_DAY) break;
    timeline.push({ minute, on: !isOn });
  }

  return timeline;
}

function stateAtMinute(timeline: Transition[], minute: number): boolean {
  let state = timeline[0].on;
  for (const transition of timeline) {
    if (transition.minute > minute) break;
    state = transition.on;
  }
  return state;
}

/**
 * Slice a span of the day into on/off runs. This is where sub-hour precision
 * comes from: power returning at :24 produces two slices, never a rounded hour.
 */
function slicesBetween(
  timeline: Transition[],
  fromMinute: number,
  toMinute: number,
  spanMinutes: number,
): SegmentSlice[] {
  const slices: SegmentSlice[] = [];
  let cursor = fromMinute;
  let isOn = stateAtMinute(timeline, fromMinute);

  for (const transition of timeline) {
    if (transition.minute <= fromMinute || transition.minute >= toMinute) continue;
    slices.push({
      state: isOn ? "on" : "off",
      fraction: (transition.minute - cursor) / spanMinutes,
    });
    cursor = transition.minute;
    isOn = transition.on;
  }

  slices.push({
    state: isOn ? "on" : "off",
    fraction: (toMinute - cursor) / spanMinutes,
  });
  return slices;
}

function hourStart(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
}

type DayOptions = {
  /** Minutes into the day after which nothing is known yet. Default: all known. */
  knownUntilMinute?: number;
  /** Past hours with no logs behind them. */
  noDataHours?: ReadonlySet<number>;
  logCountForHour: (hour: number, transitions: number) => number;
};

/** Turn a day's transitions into 24 hourly segments. */
function dayFromTimeline(
  day: Date,
  timeline: Transition[],
  { knownUntilMinute = MINUTES_PER_DAY, noDataHours, logCountForHour }: DayOptions,
): RibbonSegment[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const start = hourStart(day, hour);
    const end = hourStart(day, hour + 1);
    const fromMinute = hour * MINUTES_PER_HOUR;
    const toMinute = fromMinute + MINUTES_PER_HOUR;

    if (fromMinute >= knownUntilMinute) {
      return slicedSegment(start, end, [{ state: "unknown", fraction: 1 }], 0);
    }

    if (noDataHours?.has(hour)) {
      return slicedSegment(start, end, [{ state: "no-data", fraction: 1 }], 0);
    }

    const knownTo = Math.min(toMinute, knownUntilMinute);
    const slices = slicesBetween(timeline, fromMinute, knownTo, MINUTES_PER_HOUR);
    if (knownTo < toMinute) {
      slices.push({
        state: "unknown",
        fraction: (toMinute - knownTo) / MINUTES_PER_HOUR,
      });
    }

    return slicedSegment(start, end, slices, logCountForHour(hour, slices.length - 1));
  });
}

type MockDayOptions = {
  date: Date;
  seed: number;
  profile?: SupplyProfileName;
  /** Minutes into the day after which nothing is known yet. */
  knownUntilMinute?: number;
};

/** One day of hourly segments for a seeded, plausible area. */
export function mockDay({
  date,
  seed,
  profile = "mixed",
  knownUntilMinute,
}: MockDayOptions): RibbonSegment[] {
  const settings = SUPPLY_PROFILES[profile];
  const random = createRandom(seed);
  const timeline = buildTimeline(random, settings);

  const noDataHours = new Set<number>();
  for (let hour = 0; hour < 24; hour += 1) {
    if (random() < settings.noDataChance) noDataHours.add(hour);
  }

  return dayFromTimeline(date, timeline, {
    knownUntilMinute,
    noDataHours,
    logCountForHour: (_hour, transitions) =>
      transitions * randomInt(random, 1, 4) + randomInt(random, 0, 2),
  });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function minutesInto(now: Date): number {
  return now.getHours() * MINUTES_PER_HOUR + now.getMinutes();
}

/** Today so far — hours after now are unknown, including the running hour. */
export function mockToday(now: Date = MOCK_NOW): RibbonSegment[] {
  return mockDay({
    date: now,
    seed: 4021,
    profile: "mixed",
    knownUntilMinute: minutesInto(now),
  });
}

/** Seven days ending today. */
export function mockWeek(now: Date = MOCK_NOW): MockRibbonRow[] {
  return Array.from({ length: 7 }, (_, index) => {
    const offset = index - 6;
    const date = addDays(now, offset);
    const isToday = offset === 0;
    return {
      key: date.toDateString(),
      label: formatDayLabel(date),
      segments: isToday
        ? mockToday(now)
        : mockDay({ date, seed: 7100 + index, profile: "mixed" }),
    };
  });
}

/** Thirty days ending today — the barcode grid. */
export function mockMonth(now: Date = MOCK_NOW): MockRibbonRow[] {
  return Array.from({ length: 30 }, (_, index) => {
    const offset = index - 29;
    const date = addDays(now, offset);
    const isToday = offset === 0;
    // Coverage thins out the further back you look, so older days go sparse.
    const profile: SupplyProfileName = index < 4 ? "sparse" : "mixed";
    return {
      key: date.toDateString(),
      label: formatDayLabel(date),
      segments: isToday
        ? mockToday(now)
        : mockDay({ date, seed: 3300 + index * 17, profile }),
    };
  });
}

const COMPARISON_AREAS: { name: string; profile: SupplyProfileName; seed: number }[] =
  [
    { name: "Ikeja", profile: "reliable", seed: 91 },
    { name: "Akure South", profile: "mixed", seed: 512 },
    { name: "Gwagwalada", profile: "poor", seed: 1337 },
    { name: "Nsukka", profile: "sparse", seed: 2048 },
  ];

/** One ribbon per LGA for the same day — the comparison view. */
export function mockAreaComparison(now: Date = MOCK_NOW): MockRibbonRow[] {
  const yesterday = addDays(now, -1);
  return COMPARISON_AREAS.map((area) => ({
    key: area.name,
    label: area.name,
    segments: mockDay({ date: yesterday, seed: area.seed, profile: area.profile }),
  }));
}

/** A fragment: the outage window as it appears on a fault card. */
export function mockOutageWindow(now: Date = MOCK_NOW): RibbonSegment[] {
  const day = addDays(now, -1);
  const timeline: Transition[] = [
    { minute: 0, on: true },
    { minute: 16 * 60 + 38, on: false },
    { minute: 21 * 60 + 25, on: true },
  ];
  const logCounts = [6, 2, 1, 0, 2, 9];

  return dayFromTimeline(day, timeline, {
    logCountForHour: (hour) => logCounts[hour - 16] ?? 0,
  }).slice(16, 22);
}

/**
 * The restoration demo day. Pretends it is 15:00; power went out at 09:12 and,
 * once `restored` is true, came back at 14:15 — so the 14:00 segment flips from
 * a solid off hour to a mostly-lit partial one and surges.
 */
export function mockRestorationDay(restored: boolean): RibbonSegment[] {
  const day = new Date(2026, 7, 26);
  const timeline: Transition[] = [
    { minute: 0, on: true },
    { minute: 5 * 60, on: false },
    { minute: 6 * 60 + 30, on: true },
    { minute: 9 * 60 + 12, on: false },
    ...(restored ? [{ minute: 14 * 60 + 15, on: true }] : []),
  ];

  return dayFromTimeline(day, timeline, {
    knownUntilMinute: 15 * 60,
    logCountForHour: (hour, transitions) =>
      transitions * 4 + (hour === 14 && restored ? 7 : 1),
  });
}
