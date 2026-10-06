import { notFound } from '../http/errors.mjs';
import { readPreview } from '../preview/render.mjs';

export const routes = ({ root }) => [
  {
    method: 'GET', path: '/previews/*name',
    handle: ({ params }) => {
      const text = readPreview(root, params.name);
      if (text === null) throw notFound();
      return { status: 200, body: { name: params.name, text } };
    },
  },
];
