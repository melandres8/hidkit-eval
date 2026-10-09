import { reportCard } from '../report/card.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/terms/:term/students/:id/report-card',
    handle: ({ params }) => {
      const term = store.term(params.term);
      const student = store.student(term, params.id);
      return { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: reportCard(term, student) };
    },
  },
];
