import { safeName } from './names.mjs';
import { write } from './storage.mjs';

const FILE_ROUTE = /^\/files\/([^/]+)$/;

// req is { method, path, body }. root is the upload folder.
export function handle(req, { root }) {
  const m = FILE_ROUTE.exec(req.path);
  if (!m) return { status: 404, body: 'not found' };
  let name;
  try {
    name = decodeURIComponent(m[1]);
  } catch {
    return { status: 400, body: 'bad name' };
  }
  if (req.method === 'POST') {
    if (!safeName(name)) return { status: 400, body: 'bad name' };
    write(root, name, req.body ?? '');
    return { status: 201, body: name };
  }
  return { status: 404, body: 'not found' };
}
