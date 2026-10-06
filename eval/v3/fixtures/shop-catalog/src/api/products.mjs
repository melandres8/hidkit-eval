import { compare } from '../lib/order.mjs';
import { requireProduct } from '../lib/validate.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/products',
    handle: ({ query }) => {
      const list = store.all().filter((p) => !query.category || p.category === query.category);
      return { status: 200, body: list.sort((a, b) => compare(a.name, b.name)) };
    },
  },
  {
    method: 'POST', path: '/products',
    handle: ({ body }) => ({ status: 201, body: store.add(requireProduct(body)) }),
  },
];
