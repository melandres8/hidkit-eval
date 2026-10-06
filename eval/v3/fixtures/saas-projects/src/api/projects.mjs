import { requireStatus, requireString, STATUSES } from '../lib/validate.mjs';
import { findProject } from '../tenancy/find-project.mjs';
import { scopeToTenant } from '../tenancy/scope.mjs';

export const routes = ({ db, id, clock }) => [
  {
    method: 'GET', path: '/projects',
    handle: ({ query, ctx }) => {
      const where = STATUSES.includes(query.status) ? { status: query.status } : {};
      return { status: 200, body: db.find('projects', scopeToTenant({ where }, ctx)) };
    },
  },
  {
    method: 'POST', path: '/projects',
    handle: ({ body, ctx }) => {
      const project = db.insert('projects', {
        id: id('prj'), tenantId: ctx.tenantId, ownerId: ctx.userId, name: requireString(body.name, 'name'),
        status: 'active', createdAt: clock().toISOString(),
      });
      return { status: 201, body: project };
    },
  },
  {
    method: 'POST', path: '/projects/bulk',
    handle: ({ body }) => {
      const ids = Array.isArray(body.ids) ? body.ids : [];
      const status = requireStatus(body.changes?.status);
      const updated = db.update('projects', { where: { id: { in: ids } } }, { status });
      return { status: 200, body: { updated: updated.map((p) => p.id) } };
    },
  },
  {
    method: 'GET', path: '/projects/:id',
    handle: ({ params, ctx }) => ({ status: 200, body: findProject(db, ctx, params.id) }),
  },
  {
    method: 'PATCH', path: '/projects/:id',
    handle: ({ params, body, ctx }) => {
      const project = findProject(db, ctx, params.id);
      const changes = {};
      if (body.name !== undefined) changes.name = requireString(body.name, 'name');
      if (body.status !== undefined) changes.status = requireStatus(body.status);
      const [updated] = db.update('projects', scopeToTenant({ where: { id: project.id } }, ctx), changes);
      return { status: 200, body: updated };
    },
  },
];
