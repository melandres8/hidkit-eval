import fs from 'node:fs';

const DEFAULT_FILE = new URL('../config/gateway.json', import.meta.url);

export function loadConfig(file = DEFAULT_FILE) {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const name of ['login', 'upload']) {
    if (!(config.limits?.[name]?.max > 0)) throw new Error(`config: limits.${name}.max must be positive`);
  }
  return config;
}
