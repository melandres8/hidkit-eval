import { notFound } from '../http/errors.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/skus/:sku',
    handle: ({ params }) => {
      const product = store.get(params.sku);
      if (!product) throw notFound();
      return { status: 200, body: product };
    },
  },
];
