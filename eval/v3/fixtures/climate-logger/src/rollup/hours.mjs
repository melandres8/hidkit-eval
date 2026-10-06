import { meanOf, sumOf } from './mean.mjs';

const HOUR_MS = 60 * 60 * 1000;

// Groups readings by UTC hour. Each group has the hour, its readings, and its mean.
export function hourBuckets(readings) {
  const groups = new Map();
  for (const r of readings) {
    const hour = Math.floor(r.at / HOUR_MS);
    if (!groups.has(hour)) groups.set(hour, []);
    groups.get(hour).push(r);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, list]) => ({ hour, readings: list, count: list.length, mean: meanOf(sumOf(list), list.length) }));
}
