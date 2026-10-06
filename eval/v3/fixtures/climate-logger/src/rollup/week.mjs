import { dayRollup } from './day.mjs';

// The count and the mean of a week. `days` is a list of the readings of each day.
export function weekRollup(days) {
  const rolled = days.map((readings) => dayRollup(readings)).filter((d) => d.count > 0);
  if (rolled.length === 0) return { count: 0, mean: null };
  const total = rolled.reduce((sum, d) => sum + d.mean, 0);
  return { count: rolled.reduce((sum, d) => sum + d.count, 0), mean: Math.round(total / rolled.length) };
}
