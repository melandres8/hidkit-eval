// A file name from a client must stay inside the upload folder.
// It rejects path separators, "..", and control characters (NUL included).
export function safeName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) return false;
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  return !/[\x00-\x1f\x7f]/.test(name);
}
