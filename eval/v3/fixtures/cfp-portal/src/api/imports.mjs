import { requireSpeaker } from '../talks/access.mjs';

export const routes = ({ runJob }) => [
  {
    method: 'POST', path: '/talks/import',
    handle: ({ body, caller }) => ({ status: 201, body: runJob('import-proposals', { caller: requireSpeaker(caller), talks: body?.talks }) }),
  },
];
