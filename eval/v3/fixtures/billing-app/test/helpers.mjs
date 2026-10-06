import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { createApp } from '../src/app.mjs';

const DATA = new URL('../data/invoices/', import.meta.url);

// Every test works on its own folder, so the files in data/ never change.
export function makeApp({ seed = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'billing-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataDir = path.join(dir, 'invoices');
  if (seed) fs.cpSync(DATA, dataDir, { recursive: true });
  const app = createApp({ dataDir, clock: () => new Date('2026-03-01T10:00:00.000Z') });
  const call = (method, p, body) => app.handle({ method, path: p, body });
  return { app, call, dataDir };
}

// A draft with simple amounts: every rounding rule gives the same result.
export const simpleDraft = (overrides = {}) => ({
  customer: 'Test Customer', taxRateBps: 1000, lines: [{ description: 'Widget', quantity: 2, unitPriceMinor: 1000 }], ...overrides,
});
