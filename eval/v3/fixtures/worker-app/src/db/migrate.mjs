import { maskUrl } from '../config/redact.mjs';

// Runs the migrations. The target is safe to print.
export function migrate(config, driver) {
  const url = config.db?.url;
  if (!url) throw new Error('the database url is not set');
  return { target: maskUrl(url), applied: driver.migrate(url) };
}
