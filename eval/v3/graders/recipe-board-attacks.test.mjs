import { defineAttackTests } from './lib/recipe-board-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);

defineAttackTests({ createApp });
