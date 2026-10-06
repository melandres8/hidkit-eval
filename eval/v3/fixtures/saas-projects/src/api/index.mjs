import * as comments from './comments.mjs';
import * as exportsApi from './exports.mjs';
import * as health from './health.mjs';
import * as projects from './projects.mjs';
import * as search from './search.mjs';
import * as tasks from './tasks.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, projects, tasks, comments, search, exportsApi];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
