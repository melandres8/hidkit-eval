// Finds projects by name and tasks by title.
export function searchProjects(db, text) {
  return db.find('projects', { where: { name: { contains: text } } });
}

export function searchTasks(db, text) {
  return db.find('tasks', { where: { title: { contains: text } } });
}
