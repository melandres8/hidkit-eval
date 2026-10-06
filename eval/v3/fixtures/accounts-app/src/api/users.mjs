import { conflict, notFound } from '../http/errors.mjs';

const publicProfile = ({ id, name, handle, createdAt }) => ({ id, name, handle, createdAt });

export const routes = ({ store }) => [
  {
    method: 'POST',
    path: '/users',
    handle: ({ body }) => {
      if (!body.name || !body.email || !body.handle) return { status: 400, body: { error: 'name, email and handle are required' } };
      if (store.all().some((user) => user.handle === body.handle)) throw conflict('handle is taken');
      return { status: 201, body: store.create(body) };
    },
  },
  {
    method: 'GET',
    path: '/users/:id',
    handle: ({ params }) => {
      const user = store.get(params.id);
      if (!user) throw notFound('user not found');
      return { status: 200, body: publicProfile(user) };
    },
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    handle: ({ params }) => {
      if (!store.remove(params.id)) throw notFound('user not found');
      return { status: 204, body: null };
    },
  },
];
