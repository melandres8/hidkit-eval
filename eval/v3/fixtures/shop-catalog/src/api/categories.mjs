import { compare } from '../lib/order.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/categories',
    handle: () => ({ status: 200, body: [...new Set(store.all().map((p) => p.category))].sort(compare) }),
  },
];
