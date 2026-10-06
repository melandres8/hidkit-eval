import * as documents from './documents.mjs';
import * as exports from './exports.mjs';
import * as invoices from './invoices.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [invoices, documents, exports];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
