import { jobs } from '../jobs/index.mjs';

export const routes = (context) => [
  {
    method: 'POST', path: '/exports',
    handle: ({ ctx }) => ({ status: 201, body: jobs['export-projects'](context, { caller: ctx }) }),
  },
];
