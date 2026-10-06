export function createIds(prefix) {
  let n = 0;
  return () => `${prefix}_${++n}`;
}
