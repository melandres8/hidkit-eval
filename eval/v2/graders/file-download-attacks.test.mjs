import { defineAttackTests } from './lib/file-download-attacks.mjs';

const { handle } = await import(`${process.env.CANDIDATE_DIR}/src/server.mjs`);

defineAttackTests(handle);
