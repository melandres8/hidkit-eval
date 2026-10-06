import { jobs } from '../jobs/index.mjs';

export const routes = (context) => [
  {
    method: 'POST', path: '/bundles',
    handle: ({ body }) => ({ status: 201, body: jobs['build-bundle'](context, { name: body.name, files: body.files }) }),
  },
];
