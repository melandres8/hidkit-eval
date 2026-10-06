import { requireOrganizer } from '../talks/access.mjs';
import { checkReview } from '../talks/values.mjs';

export const routes = ({ talks }) => [
  {
    method: 'POST', path: '/talks/:id/review',
    handle: ({ params, body, caller }) => {
      requireOrganizer(caller);
      const review = checkReview(body);
      talks.get(params.id);
      return { status: 200, body: talks.update(params.id, review) };
    },
  },
];
