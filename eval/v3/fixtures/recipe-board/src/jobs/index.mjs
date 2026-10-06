import { tagCounts } from './tag-counts.mjs';
import { weeklyDigest } from './weekly-digest.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'weekly-digest': weeklyDigest,
  'tag-counts': tagCounts,
};
