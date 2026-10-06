import { badRequest } from '../http/errors.mjs';

export const routes = ({ log }) => [
  {
    method: 'GET', path: '/entries',
    handle: ({ query }) => {
      if (typeof query.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)) throw badRequest('bad date');
      return { status: 200, body: log.ofDay(query.date) };
    },
  },
];
