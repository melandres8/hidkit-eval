import { dailySummary } from './daily-summary.mjs';
import { expirePasses } from './expire-passes.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'daily-summary': dailySummary,
  'expire-passes': expirePasses,
};
