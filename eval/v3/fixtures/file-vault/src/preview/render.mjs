import fs from 'node:fs';
import path from 'node:path';
import { filePath } from '../storage/layout.mjs';

const PREVIEW_CHARS = 200;
const HEAD_BYTES = 4096;

// The text of a preview: the first 200 characters, with each run of white space cut to one space.
export const renderPreview = (text) => text.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_CHARS);

// Reads only the head of the file, so a large file costs little.
function readHead(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const read = fs.readSync(fd, buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, read).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

// Returns the preview text of a file, or null when there is no such file. The text is cached on disk.
export function readPreview(root, name) {
  const source = filePath(root, 'files', name);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return null;
  const cache = filePath(root, 'previews', `${name}.preview`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache, 'utf8');
  const text = renderPreview(readHead(source));
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, text);
  return text;
}
