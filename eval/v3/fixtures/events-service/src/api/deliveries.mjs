import { notFound } from '../http/errors.mjs';

export const routes = ({ deliveries }) => [
  {
    method: 'GET', path: '/deliveries/:id',
    handle: ({ params }) => {
      const delivery = deliveries.get(params.id);
      if (!delivery) throw notFound();
      return { status: 200, body: delivery };
    },
  },
];
