import * as health from './health.mjs';
import * as login from './login.mjs';
import * as uploads from './uploads.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, login, uploads];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
