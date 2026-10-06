import fs from 'node:fs';
import { notFound } from '../http/errors.mjs';
import { resolveInside } from '../storage/paths.mjs';

export const routes = ({ storage }) => [
  {
    method: 'GET', path: '/folders/*name',
    handle: ({ params }) => {
      const dir = resolveInside(storage.filesDir, params.name);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw notFound();
      const entries = fs.readdirSync(dir, { withFileTypes: true })
        .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
        .sort();
      return { status: 200, body: { folder: params.name, entries } };
    },
  },
];
