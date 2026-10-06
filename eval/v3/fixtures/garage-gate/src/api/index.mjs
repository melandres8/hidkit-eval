import * as camera from './camera.mjs';
import * as entries from './entries.mjs';
import * as health from './health.mjs';
import * as passes from './passes.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, camera, entries, passes];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
