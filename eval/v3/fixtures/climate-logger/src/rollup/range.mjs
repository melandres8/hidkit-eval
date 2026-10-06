const DAY_MS = 24 * 60 * 60 * 1000;

// The start and the end of a UTC day, in milliseconds. `date` is YYYY-MM-DD.
export function utcDay(date) {
  const from = Date.parse(`${date}T00:00:00.000Z`);
  return { from, to: from + DAY_MS };
}

export const addDays = (ms, days) => ms + days * DAY_MS;
export const dateOf = (ms) => new Date(ms).toISOString().slice(0, 10);
