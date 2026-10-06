import fs from 'node:fs';
import path from 'node:path';

export function write(root, name, data) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, name), data);
}

export function read(root, name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}
