import path from 'node:path';
import { badRequest } from '../http/errors.mjs';

// The absolute path of `name` inside `base`. A name that is empty, is absolute,
// holds a NUL byte or a backslash, or leaves `base` gives 400.
export function resolveInside(base, name) {
  if (typeof name !== 'string' || name === '' || name.includes('\0') || name.includes('\\')) throw badRequest('invalid name');
  const full = path.resolve(base, name);
  const relative = path.relative(base, full);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw badRequest('invalid name');
  return full;
}
