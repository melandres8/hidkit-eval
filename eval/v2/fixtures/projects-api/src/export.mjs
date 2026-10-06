// Full export for support. It includes every record.
export function exportAll(store) {
  return store.all().map((project) => ({ ...project }));
}
