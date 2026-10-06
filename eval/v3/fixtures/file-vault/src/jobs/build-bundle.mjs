import fs from 'node:fs';
import path from 'node:path';
import { badRequest, notFound } from '../http/errors.mjs';
import { MAX_BUNDLE_FILES } from '../lib/limits.mjs';
import { filePath } from '../storage/layout.mjs';

export function buildBundle({ root }, { name, files } = {}) {
  if (typeof name !== 'string' || name === '') throw badRequest('name is required');
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_BUNDLE_FILES || files.some((f) => typeof f !== 'string')) {
    throw badRequest(`files must be a list of 1 to ${MAX_BUNDLE_FILES} names`);
  }
  const parts = files.map((file) => {
    const source = filePath(root, 'files', file);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw notFound(`missing file ${file}`);
    return `== ${file} ==\n${fs.readFileSync(source, 'utf8')}\n`;
  });
  const target = filePath(root, 'bundles', `${name}.bundle`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, parts.join(''));
  return { bundle: `${name}.bundle`, files: files.length };
}
