import { jobs } from '../jobs/index.mjs';

export const routes = (context) => [
  {
    method: 'POST', path: '/exports',
    handle: () => ({ status: 201, body: jobs['export-catalog'](context) }),
  },
];
