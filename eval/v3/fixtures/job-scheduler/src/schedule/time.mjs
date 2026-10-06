// Parses "HH:MM" on a 24 hour clock. Returns null when the text is not a valid time.
export function parseTime(text) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(text));
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}
