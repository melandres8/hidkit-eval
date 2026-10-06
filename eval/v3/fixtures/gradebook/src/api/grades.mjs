import { finalGrade } from '../grades/final.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET', path: '/terms/:term/students/:id/grade',
    handle: ({ params }) => {
      const term = store.term(params.term);
      const student = store.student(term, params.id);
      return { status: 200, body: { student: student.id, ...finalGrade(term, student) } };
    },
  },
];
