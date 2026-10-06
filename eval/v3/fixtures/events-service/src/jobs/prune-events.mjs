const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function pruneEvents({ events, clock }) {
  return events.removeBefore(new Date(clock().getTime() - WEEK_MS));
}
