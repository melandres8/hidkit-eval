import { defineAttackTests } from './lib/order-sorting-attacks.mjs';

const { addOrder, openDb } = await import(`${process.env.CANDIDATE_DIR}/src/db.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);

defineAttackTests({ addOrder, openDb, route });
