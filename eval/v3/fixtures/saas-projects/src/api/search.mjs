import { badRequest } from '../http/errors.mjs';
import { searchProjects, searchTasks } from '../search/index.mjs';

export const routes = ({ db }) => [
  {
    method: 'GET', path: '/search',
    handle: ({ query }) => {
      if (typeof query.q !== 'string' || query.q.trim() === '') throw badRequest('q is required');
      const text = query.q.trim();
      return { status: 200, body: { projects: searchProjects(db, text), tasks: searchTasks(db, text) } };
    },
  },
];
