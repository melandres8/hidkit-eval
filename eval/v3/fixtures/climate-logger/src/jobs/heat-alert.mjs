import { badRequest } from '../http/errors.mjs';
import { ALERT_ABOVE } from '../lib/config.mjs';
import { requireDate } from '../lib/validate.mjs';
import { hourBuckets } from '../rollup/hours.mjs';
import { utcDay } from '../rollup/range.mjs';

// Finds the sensors whose mean for the day is above the alert level.
export function heatAlert({ store }, { date } = {}) {
  if (typeof date !== 'string') throw badRequest('date is required');
  const day = requireDate(date);
  const { from, to } = utcDay(day);
  const alerts = store.sensors().filter((sensor) => {
    const buckets = hourBuckets(store.between(sensor, from, to));
    if (buckets.length === 0) return false;
    const mean = buckets.reduce((sum, b) => sum + b.mean, 0) / buckets.length;
    return mean > ALERT_ABOVE;
  });
  return { date: day, alerts };
}
