import { get, set } from './get.mjs';

// The sections whose url key holds a URL that can carry a password.
const SECTIONS_WITH_URLS = ['db', 'cache'];
const URL_PATHS = SECTIONS_WITH_URLS.map((section) => `${section}.url`);

// Replaces the password of a URL with ***.
export function maskUrl(text) {
  try {
    const url = new URL(text);
    if (url.password) url.password = '***';
    return url.href;
  } catch {
    return '***';
  }
}

// Returns a copy of the settings that is safe to print.
export function redact(config) {
  const copy = structuredClone(config);
  for (const path of URL_PATHS) {
    const value = get(copy, path);
    if (typeof value === 'string') set(copy, path, maskUrl(value));
  }
  return copy;
}
