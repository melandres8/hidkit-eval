import { readPlate } from '../camera/read.mjs';

// Decides if the gate opens for a camera event.
export function decide({ passes, blocklist, clock }, event) {
  const plate = readPlate(event);
  if (blocklist.has(plate)) return { open: false, reason: 'blocked' };
  const today = clock().toISOString().slice(0, 10);
  const pass = passes.all().find((p) => p.plate === plate && p.until >= today);
  return pass ? { open: true, reason: 'pass' } : { open: false, reason: 'no-pass' };
}
