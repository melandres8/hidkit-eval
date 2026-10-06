import * as feed from './feed.mjs';
import * as health from './health.mjs';
import * as pages from './pages.mjs';
import * as recipes from './recipes.mjs';
import * as search from './search.mjs';
import * as tags from './tags.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, recipes, pages, search, tags, feed];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
