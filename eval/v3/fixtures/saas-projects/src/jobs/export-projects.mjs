import { toCsv } from '../lib/csv.mjs';

// Builds the CSV of the projects of a tenant, one row for each project.
export function exportProjects({ db }, { caller }) {
  const projects = db.find('projects');
  const rows = projects.map((p) => [p.id, p.name, p.status, p.ownerId, db.find('tasks', { where: { projectId: p.id } }).length]);
  return { filename: `projects-${caller.tenantId}.csv`, csv: toCsv(['id', 'name', 'status', 'owner', 'tasks'], rows) };
}
