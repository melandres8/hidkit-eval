import { requireString } from '../lib/validate.mjs';
import { findProject } from '../tenancy/find-project.mjs';
import { scopeToTenant } from '../tenancy/scope.mjs';

export const routes = ({ db, id, clock }) => [
  {
    method: 'GET', path: '/projects/:id/comments',
    handle: ({ params, ctx }) => {
      const project = findProject(db, ctx, params.id);
      return { status: 200, body: db.find('comments', scopeToTenant({ where: { projectId: project.id } }, ctx)) };
    },
  },
  {
    method: 'POST', path: '/projects/:id/comments',
    handle: ({ params, body, ctx }) => {
      const project = findProject(db, ctx, params.id);
      const comment = db.insert('comments', {
        id: id('cmt'), tenantId: ctx.tenantId, projectId: project.id, authorId: ctx.userId,
        body: requireString(body.body, 'body'), createdAt: clock().toISOString(),
      });
      return { status: 201, body: comment };
    },
  },
];
