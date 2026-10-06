import { requireString } from '../lib/validate.mjs';
import { findProject } from '../tenancy/find-project.mjs';
import { scopeToTenant } from '../tenancy/scope.mjs';

export const routes = ({ db, id }) => [
  {
    method: 'GET', path: '/projects/:id/tasks',
    handle: ({ params, ctx }) => {
      const project = findProject(db, ctx, params.id);
      return { status: 200, body: db.find('tasks', scopeToTenant({ where: { projectId: project.id } }, ctx)) };
    },
  },
  {
    method: 'POST', path: '/projects/:id/tasks',
    handle: ({ params, body, ctx }) => {
      const project = findProject(db, ctx, params.id);
      const task = db.insert('tasks', { id: id('tsk'), tenantId: ctx.tenantId, projectId: project.id, title: requireString(body.title, 'title'), done: false });
      return { status: 201, body: task };
    },
  },
];
