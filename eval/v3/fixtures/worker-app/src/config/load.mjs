import fs from 'node:fs';
import { DEFAULTS } from './defaults.mjs';
import { ENV } from './env.mjs';
import { set } from './get.mjs';
import { SECTIONS } from './schema.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function merge(base, extra) {
  for (const [key, value] of Object.entries(extra)) {
    base[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return base;
}

// Reads a settings file and returns the settings. Calls warn(message) for each problem that does not stop the load.
export function loadConfig(file, { env = process.env, warn = () => {} } = {}) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of Object.keys(raw)) {
    if (!SECTIONS.includes(key)) warn(`unknown config section "${key}"`);
  }
  const config = merge(structuredClone(DEFAULTS), raw);
  for (const [name, path] of Object.entries(ENV)) {
    if (env[name] !== undefined && env[name] !== '') set(config, path, env[name]);
  }
  return config;
}
