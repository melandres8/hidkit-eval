export const stats = { runs: 0, lastWindow: null };

const DAY_MS = 24 * 60 * 60 * 1000;

// Syncs the ledger for the calendar day that ended before the run.
export function syncLedger(job, scheduledAt) {
  stats.runs += 1;
  const to = new Date(scheduledAt);
  to.setHours(0, 0, 0, 0);
  stats.lastWindow = { from: new Date(to.getTime() - DAY_MS).toISOString(), to: to.toISOString() };
}
