import { defineAttackTests } from './lib/doc-sharing-attacks.mjs';

const { createDocs } = await import(`${process.env.CANDIDATE_DIR}/src/docs.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);

defineAttackTests({ createDocs, route });
