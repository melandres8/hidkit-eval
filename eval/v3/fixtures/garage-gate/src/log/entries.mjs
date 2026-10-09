import { readPlate } from '../camera/read.mjs';

// The entry log: one entry for each read of the camera, oldest first.
export function createEntryLog({ clock }) {
  const entries = [];
  return {
    record(event, decision) {
      const entry = { at: clock().toISOString(), camera: event.camera, plate: readPlate(event), open: decision.open, reason: decision.reason };
      entries.push(entry);
      return entry;
    },
    ofDay: (date) => entries.filter((e) => e.at.slice(0, 10) === date).map((e) => ({ ...e })),
  };
}
