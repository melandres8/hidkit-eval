import fs from 'node:fs';
import { filePath } from '../storage/layout.mjs';

// Removes every cached preview and returns how many files it removed.
export function cleanPreviews({ root }) {
  const dir = filePath(root, 'previews', '');
  let removed = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = `${current}${entry.name}`;
      if (entry.isDirectory()) walk(`${full}/`);
      else removed += (fs.unlinkSync(full), 1);
    }
  };
  walk(dir);
  return { removed };
}
