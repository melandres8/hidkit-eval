import { pruneEvents } from './prune-events.mjs';

// The job table. A job name maps to an async function that takes the app context.
export const jobs = {
  'prune-events': pruneEvents,
};
