import { exportUsers } from '../export/admin-export.mjs';
import { requireAdmin } from '../http/admin.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET',
    path: '/admin/users/export',
    handle: ({ actor }) => {
      requireAdmin(actor);
      return { status: 200, body: exportUsers(store) };
    },
  },
];
