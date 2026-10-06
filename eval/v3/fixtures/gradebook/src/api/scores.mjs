import { badRequest, conflict } from '../http/errors.mjs';

const whole = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

export const routes = ({ store }) => [
  {
    method: 'POST', path: '/terms/:term/students/:id/scores',
    handle: ({ params, body }) => {
      const term = store.term(params.term);
      const student = store.student(term, params.id);
      if (term.closed) throw conflict('the term is closed');
      const { category, points, max } = body ?? {};
      if (!term.categories.some((c) => c.name === category)) throw badRequest('unknown category');
      if (!whole(max, 1, 1000) || !whole(points, 0, max)) throw badRequest('bad points or max');
      const score = { category, points, max };
      student.scores.push(score);
      return { status: 201, body: score };
    },
  },
];
