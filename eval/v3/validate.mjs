#!/usr/bin/env node
// Checks every v3 grader against its reference patches. The logic lives in eval/lib/validate.mjs.
// usage: node eval/v3/validate.mjs [--scenario <id>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSet } from '../lib/validate.mjs';

validateSet(path.dirname(fileURLToPath(import.meta.url)), {
  // Every shallow patch must pass the fixture tests and the frozen tests.
  strictShallow: true,
  // The original ignores x-forwarded-for, so nobody can spoof it. The attack cases pass on the original, as for a new feature.
  injectionOriginal: { 'rate-limit-keys': 'PASS' },
  // These patches block every attack, so the attack cases pass. They miss another rule: the user key, the connection address, shared tenant data, valid names that look odd, text stored as typed, or the writes of organizers.
  injectionShallowPass: { 'rate-limit-keys': ['shallow-no-user-key', 'shallow-key-in-place'], 'tenant-isolation': ['shallow-owner-scoped'], 'file-vault': ['shallow-includes-dots'], 'recipe-board': ['shallow-escape-on-save'], 'cfp-portal': ['shallow-store-pick'] },
});
