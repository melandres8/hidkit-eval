import { readPlate } from '../camera/read.mjs';
import { plateKey } from '../plates/key.mjs';

// Decides if the gate opens for a camera event.
export function decide({ passes, clock }, event) {
  const key = plateKey(readPlate(event));
  const today = clock().toISOString().slice(0, 10);
  const pass = passes.all().find((p) => plateKey(p.plate) === key && p.until >= today);
  return pass ? { open: true, reason: 'pass' } : { open: false, reason: 'no-pass' };
}
