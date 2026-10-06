export function searchProjects(store, q = '') {
  const needle = q.toLowerCase();
  const found = [];
  for (const project of store.all()) {
    if (project.name.toLowerCase().includes(needle)) found.push(project);
  }
  return found;
}
