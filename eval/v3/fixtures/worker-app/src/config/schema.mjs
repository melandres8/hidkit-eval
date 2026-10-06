import { get } from './get.mjs';

// The top-level sections that a settings file may have.
export const SECTIONS = ['db', 'cache', 'queue', 'pool', 'log'];

const REQUIRED = ['db.url', 'queue.name'];
const URL_KEYS = ['db.url', 'cache.url'];
const LEVELS = ['debug', 'info', 'warn', 'error'];

// Returns a list of problems. An empty list means the settings are valid.
export function check(config) {
  const problems = [];
  for (const key of REQUIRED) {
    if (get(config, key) === undefined || get(config, key) === '') problems.push(`missing required key "${key}"`);
  }
  for (const key of URL_KEYS) {
    const value = get(config, key);
    if (value === undefined) continue;
    try {
      new URL(value);
    } catch {
      problems.push(`"${key}" is not a valid URL`);
    }
  }
  const size = get(config, 'pool.size');
  if (!Number.isInteger(size) || size < 1) problems.push('"pool.size" must be a whole number of 1 or more');
  if (!LEVELS.includes(get(config, 'log.level'))) problems.push(`"log.level" must be one of ${LEVELS.join(', ')}`);
  return problems;
}
