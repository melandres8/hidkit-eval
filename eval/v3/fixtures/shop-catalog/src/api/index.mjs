import * as categories from './categories.mjs';
import * as exportsApi from './exports.mjs';
import * as health from './health.mjs';
import * as products from './products.mjs';
import * as search from './search.mjs';
import * as skus from './skus.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, products, skus, categories, search, exportsApi];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
