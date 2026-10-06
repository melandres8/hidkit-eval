import fs from 'node:fs';
import { createApp } from '../src/app.mjs';

export const loadTerms = () => JSON.parse(fs.readFileSync(new URL('../data/terms.json', import.meta.url), 'utf8'));

export function makeApp(terms = loadTerms()) {
  const app = createApp({ terms, clock: () => new Date('2026-06-01T12:00:00.000Z') });
  const call = (method, path, body) => app.handle({ method, path, body });
  return { app, call };
}
