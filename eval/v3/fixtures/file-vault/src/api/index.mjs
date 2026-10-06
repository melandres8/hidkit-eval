import * as bundles from './bundles.mjs';
import * as files from './files.mjs';
import * as folders from './folders.mjs';
import * as health from './health.mjs';
import * as previews from './previews.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, files, previews, bundles, folders];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
