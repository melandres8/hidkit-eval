import * as health from './health.mjs';
import * as readings from './readings.mjs';
import * as sensors from './sensors.mjs';

// Each module exports routes(context). Add a module to this list to mount its routes.
const modules = [health, readings, sensors];

export const buildRoutes = (context) => modules.flatMap((m) => m.routes(context));
