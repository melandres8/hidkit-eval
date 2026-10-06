import { notFound } from '../http/errors.mjs';
import { scopeToTenant } from './scope.mjs';

// Returns a project of the tenant, or throws a 404.
export function findProject(db, ctx, id) {
  const [project] = db.find('projects', scopeToTenant({ where: { id } }, ctx));
  if (!project) throw notFound();
  return project;
}
