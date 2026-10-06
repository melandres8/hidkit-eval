import { defineAttackTests } from './lib/rate-limit-keys-attacks.mjs';

const { createGateway } = await import(`${process.env.CANDIDATE_DIR}/src/gateway.mjs`);

defineAttackTests({ createGateway });
