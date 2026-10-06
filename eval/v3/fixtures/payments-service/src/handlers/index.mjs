import * as health from './health.mjs';
import * as ledger from './ledger.mjs';
import * as payments from './payments.mjs';
import * as reports from './reports.mjs';

// Each module exports routes(ctx). Add a module to this list to mount its routes.
const modules = [health, payments, ledger, reports];

export const buildRoutes = (ctx) => modules.flatMap((m) => m.routes(ctx));
