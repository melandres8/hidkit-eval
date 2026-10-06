import fs from 'node:fs';

// The todo file is a JSON array of { id, title, done }. A missing file means no todos.
export function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function save(file, todos) {
  fs.writeFileSync(file, `${JSON.stringify(todos, null, 2)}\n`);
}
