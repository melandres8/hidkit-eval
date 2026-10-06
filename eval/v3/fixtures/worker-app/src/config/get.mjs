// Helpers for dotted key paths such as "queue.name".
export function get(object, path) {
  return path.split('.').reduce((value, part) => (value !== null && typeof value === 'object' ? value[part] : undefined), object);
}

export function set(object, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((node, part) => (node[part] = node[part] ?? {}), object);
  target[last] = value;
}
