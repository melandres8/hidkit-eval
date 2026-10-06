import fs from 'node:fs';
import path from 'node:path';
import { notFound } from '../http/errors.mjs';

function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (
    entry.isDirectory() ? walk(path.join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]
  ));
}

// The files of the vault. A name is a path relative to the files folder.
export function createStorage({ root }) {
  const filesDir = path.join(root, 'files');
  fs.mkdirSync(filesDir, { recursive: true });
  const pathOf = (name) => path.join(filesDir, name);
  const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();
  return {
    filesDir,
    pathOf,
    list: () => walk(filesDir).sort(),
    read(name) {
      const file = pathOf(name);
      if (!isFile(file)) throw notFound();
      return fs.readFileSync(file, 'utf8');
    },
    write(name, content) {
      const file = pathOf(name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      return { name, size: Buffer.byteLength(content) };
    },
    remove(name) {
      const file = pathOf(name);
      if (!isFile(file)) throw notFound();
      fs.unlinkSync(file);
    },
  };
}
