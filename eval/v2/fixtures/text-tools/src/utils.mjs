// Helpers for text, dates and arrays.

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

// "Hello, World!" -> "hello-world"
export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Cuts text to at most max characters. The cut ends with an ellipsis.
export function truncate(text, max, ellipsis = '…') {
  const value = String(text);
  if (value.length <= max) return value;
  if (max <= ellipsis.length) return ellipsis.slice(0, max);
  const cut = value.slice(0, max - ellipsis.length);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > cut.length / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}${ellipsis}`;
}

// "the lord of the rings" -> "The Lord of the Rings"
export function titleCase(text) {
  return String(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, words) => {
      if (i > 0 && i < words.length - 1 && SMALL_WORDS.has(word)) return word;
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Parses "YYYY-MM-DD" as a UTC date. Returns null for a bad or impossible date.
export function parseIsoDate(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

// Adds whole days in UTC. A negative count goes back.
export function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Formats a date as "YYYY-MM-DD" in UTC.
export function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Splits a list into lists of at most size items.
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Keeps the first item for each key.
export function uniqueBy(items, keyOf) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
