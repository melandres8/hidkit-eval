import { addDays, formatIsoDate, parseIsoDate, slugify, titleCase, uniqueBy } from './utils.mjs';

// entries is a list of { title, date, days }. Each entry is due days after its date.
// Duplicate titles (same slug) keep the first entry. Bad dates are skipped.
export function buildReport(entries) {
  const unique = uniqueBy(entries, (e) => slugify(e.title));
  const lines = [];
  for (const entry of unique) {
    const start = parseIsoDate(entry.date);
    if (!start) continue;
    lines.push(`${slugify(entry.title)}: ${titleCase(entry.title)}, due ${formatIsoDate(addDays(start, entry.days))}`);
  }
  return lines.join('\n');
}
