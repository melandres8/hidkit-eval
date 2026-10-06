import { dayRollup } from '../rollup/day.mjs';
import { weekRollup } from '../rollup/week.mjs';
import { formatHundredths } from '../lib/format.mjs';
import { requireDate } from '../lib/validate.mjs';
import { utcDay, addDays, dateOf } from '../rollup/range.mjs';

const show = (mean) => (mean === null ? null : formatHundredths(mean));

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/sensors',
    handle: () => ({ status: 200, body: store.sensors() }),
  },
  {
    method: 'GET', path: '/sensors/:id/day',
    handle: ({ params, query }) => {
      const date = requireDate(query.date);
      const { from, to } = utcDay(date);
      const { count, mean } = dayRollup(store.between(params.id, from, to));
      return { status: 200, body: { sensor: params.id, date, count, mean: show(mean) } };
    },
  },
  {
    method: 'GET', path: '/sensors/:id/week',
    handle: ({ params, query }) => {
      const from = requireDate(query.from);
      const days = Array.from({ length: 7 }, (_, i) => dateOf(addDays(utcDay(from).from, i)));
      const perDay = days.map((date) => {
        const { from: start, to } = utcDay(date);
        return { date, readings: store.between(params.id, start, to) };
      });
      const week = weekRollup(perDay.map((d) => d.readings));
      return {
        status: 200,
        body: {
          sensor: params.id, from, count: week.count, mean: show(week.mean),
          days: perDay.map((d) => {
            const day = dayRollup(d.readings);
            return { date: d.date, count: day.count, mean: show(day.mean) };
          }),
        },
      };
    },
  },
];
