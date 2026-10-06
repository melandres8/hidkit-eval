import * as admin from './admin.mjs';
import * as mentions from './mentions.mjs';
import * as search from './search.mjs';
import * as users from './users.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [users, search, mentions, admin];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
