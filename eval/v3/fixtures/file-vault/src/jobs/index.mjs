import { buildBundle } from './build-bundle.mjs';
import { cleanPreviews } from './clean-previews.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'build-bundle': buildBundle,
  'clean-previews': cleanPreviews,
};
