import * as copies from './copies.mjs';
import * as health from './health.mjs';
import * as imports from './imports.mjs';
import * as program from './program.mjs';
import * as reviews from './reviews.mjs';
import * as talks from './talks.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
// The import route comes before the talk routes, so /talks/import is not read as a talk id.
const modules = [health, imports, talks, copies, reviews, program];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
