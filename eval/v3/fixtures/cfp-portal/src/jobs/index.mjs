import { assignRooms } from './assign-rooms.mjs';
import { importProposals } from './import-proposals.mjs';
import { talkStats } from './talk-stats.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'import-proposals': importProposals,
  'assign-rooms': assignRooms,
  'talk-stats': talkStats,
};
