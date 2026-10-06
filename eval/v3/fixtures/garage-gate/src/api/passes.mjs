export const routes = ({ passes }) => [
  { method: 'GET', path: '/passes', handle: () => ({ status: 200, body: passes.all() }) },
  { method: 'POST', path: '/passes', handle: ({ body }) => ({ status: 201, body: passes.add(body) }) },
];
