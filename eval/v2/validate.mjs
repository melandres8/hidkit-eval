#!/usr/bin/env node
// Checks every v2 grader against its reference patches. The logic lives in eval/lib/validate.mjs.
// usage: node eval/v2/validate.mjs [--scenario <id>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSet } from '../lib/validate.mjs';

// A new feature has no attack surface before the change: the route is missing or the parameter is ignored,
// or (doc-sharing) nobody can be added as a reader.
// So the attack cases pass on the original. A security fix of existing code would expect FAIL here.
validateSet(path.dirname(fileURLToPath(import.meta.url)), {
  injectionOriginal: { 'file-download': 'PASS', 'order-sorting': 'PASS', 'doc-sharing': 'PASS' },
});
