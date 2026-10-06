import * as deliveries from './deliveries.mjs';
import * as events from './events.mjs';
import * as health from './health.mjs';
import * as subscriptions from './subscriptions.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, subscriptions, events, deliveries];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
