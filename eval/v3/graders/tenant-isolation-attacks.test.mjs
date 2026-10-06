import { defineAttackTests } from './lib/tenant-isolation-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);

defineAttackTests({ createApp });
