// Counts projects by status, for the dashboard.
export function projectStats(store) {
  const counts = {};
  for (const project of store.all()) counts[project.status] = (counts[project.status] ?? 0) + 1;
  return counts;
}
