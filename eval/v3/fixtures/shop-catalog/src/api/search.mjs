import { badRequest } from '../http/errors.mjs';
import { searchProducts } from '../search/index.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/search',
    handle: ({ query }) => {
      if (typeof query.q !== 'string' || query.q.trim() === '') throw badRequest('q is required');
      return { status: 200, body: { products: searchProducts(store, query.q.trim()) } };
    },
  },
];
