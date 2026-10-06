// The readings, in memory. A reading is { id, sensor, at, hundredths }, with `at` in milliseconds.
export function createStore() {
  const readings = [];
  return {
    add(reading) {
      const saved = { id: `r_${readings.length + 1}`, ...reading };
      readings.push(saved);
      return { ...saved };
    },
    sensors: () => [...new Set(readings.map((r) => r.sensor))].sort(),
    // The readings of one sensor from `from` (included) to `to` (excluded).
    between: (sensor, from, to) => readings.filter((r) => r.sensor === sensor && r.at >= from && r.at < to).map((r) => ({ ...r })),
  };
}
