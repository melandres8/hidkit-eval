import { checkObject, checkValue } from './values.mjs';

// A row of an import comes from a spreadsheet. The title loses the spaces at its ends, and track and level may be in any case.
export function checkRow(row) {
  checkObject(row);
  const lower = (value) => (typeof value === 'string' ? value.toLowerCase() : value);
  const out = { ...row, title: typeof row.title === 'string' ? row.title.trim() : row.title, abstract: row.abstract ?? '', track: lower(row.track), level: lower(row.level) };
  for (const field of ['title', 'abstract', 'track', 'level']) checkValue(field, out[field]);
  return out;
}
