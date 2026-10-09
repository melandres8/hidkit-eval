import { defineAttackTests } from './lib/cfp-portal-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);

defineAttackTests({ createApp });
