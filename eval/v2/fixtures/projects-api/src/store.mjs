// In-memory project store. A project is { id, name, status }, and status is "active" or "done".
export function createStore() {
  const projects = new Map();
  let nextId = 1;
  return {
    create({ name, status = 'active' }) {
      const project = { id: nextId++, name, status };
      projects.set(project.id, project);
      return project;
    },
    get: (id) => projects.get(id) ?? null,
    all: () => [...projects.values()],
    remove: (id) => projects.delete(id),
  };
}
