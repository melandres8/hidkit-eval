import * as exports from './exports.mjs';
import * as grades from './grades.mjs';
import * as health from './health.mjs';
import * as reportCards from './report-cards.mjs';
import * as scores from './scores.mjs';
import * as terms from './terms.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, grades, reportCards, scores, exports, terms];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
