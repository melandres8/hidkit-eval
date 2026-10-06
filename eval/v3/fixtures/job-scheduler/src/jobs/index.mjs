import { cleanupTemp } from './cleanup-temp.mjs';
import { sendDigest } from './send-digest.mjs';
import { syncLedger } from './sync-ledger.mjs';

// The handler table. A task name maps to a function (job, scheduledAt).
export const handlers = {
  'send-digest': sendDigest,
  'cleanup-temp': cleanupTemp,
  'sync-ledger': syncLedger,
};
