import { checkPlate, checkText } from '../plates/check.mjs';

// The blocklist. A plate on it never opens the gate.
export function createBlocklist(stored = []) {
  const entries = stored.map(({ plate, reason }) => ({ plate, reason }));
  const plates = new Set(entries.map((e) => e.plate));
  return {
    has: (plate) => plates.has(plate),
    add(body) {
      const entry = { plate: checkPlate(body?.plate).trim(), reason: checkText(body?.reason, 'reason') };
      entries.push(entry);
      plates.add(entry.plate);
      return entry;
    },
    list: () => entries.map((e) => ({ ...e })),
  };
}
