import { requireContent } from '../lib/validate.mjs';

export const routes = ({ storage }) => [
  {
    method: 'GET', path: '/files',
    handle: () => ({ status: 200, body: { files: storage.list() } }),
  },
  {
    method: 'GET', path: '/files/*name',
    handle: ({ params }) => ({ status: 200, body: { name: params.name, content: storage.read(params.name) } }),
  },
  {
    method: 'PUT', path: '/files/*name',
    handle: ({ params, body }) => ({ status: 200, body: storage.write(params.name, requireContent(body.content)) }),
  },
  {
    method: 'DELETE', path: '/files/*name',
    handle: ({ params }) => {
      storage.remove(params.name);
      return { status: 200, body: { removed: params.name } };
    },
  },
];
