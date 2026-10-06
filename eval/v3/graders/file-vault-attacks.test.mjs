import { defineAttackTests } from './lib/file-vault-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);

defineAttackTests({ createApp });
