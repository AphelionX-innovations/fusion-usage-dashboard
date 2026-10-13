import { toRangeBounds } from "./format";
import type { Granularity, TraceBucket, UsageRange } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const STEP_MS: Record<Granularity, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
  week: 7 * DAY_MS,
};

export type Periods = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  current: UsageRange;
  previous: UsageRange;
  days: number;
};

export function buildPeriods(fromDate: string, toDate: string): Periods {
  const { from, to } = toRangeBounds(fromDate, toDate);
  const span = to.getTime() - from.getTime() + 1;
  const previousFrom = new Date(from.getTime() - span);
  const previousTo = new Date(from.getTime() - 1);
  return {
    from,
    to,
    previousFrom,
    previousTo,
    current: { from: from.toISOString(), to: to.toISOString() },
    previous: { from: previousFrom.toISOString(), to: previousTo.toISOString() },
    days: Math.max(1, Math.round(span / DAY_MS)),
  };
}

function bucketStart(time: number, granularity: Granularity): number {
  const date = new Date(time);
  if (granularity === "hour") {
    date.setUTCMinutes(0, 0, 0);
    return date.getTime();
  }
  date.setUTCHours(0, 0, 0, 0);
  if (granularity === "week") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  }
  return date.getTime();
}

export function fillSeries(
  series: TraceBucket[],
  from: Date,
  to: Date,
  granularity: Granularity,
): TraceBucket[] {
  const counts = new Map<number, number>();
  for (const bucket of series) {
    const time = new Date(bucket.bucket).getTime();
    if (!Number.isNaN(time)) counts.set(time, (counts.get(time) ?? 0) + bucket.traceCount);
  }

  const times = new Set(counts.keys());
  const step = STEP_MS[granularity];
  for (let time = bucketStart(from.getTime(), granularity); time <= to.getTime(); time += step) {
    times.add(time);
  }

  return [...times]
    .sort((left, right) => left - right)
    .map((time) => ({
      bucket: new Date(time).toISOString(),
      traceCount: counts.get(time) ?? 0,
    }));
}
