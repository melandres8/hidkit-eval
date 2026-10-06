import { hourBuckets } from './hours.mjs';

// The count and the mean of the readings of one day. The mean is null when there are no readings.
export function dayRollup(readings) {
  const buckets = hourBuckets(readings);
  if (buckets.length === 0) return { count: 0, mean: null };
  const total = buckets.reduce((sum, b) => sum + b.mean, 0);
  return { count: readings.length, mean: Math.round(total / buckets.length) };
}
