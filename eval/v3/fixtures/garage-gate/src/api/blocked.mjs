export const routes = ({ blocklist }) => [
  { method: 'GET', path: '/blocked', handle: () => ({ status: 200, body: blocklist.list() }) },
  { method: 'POST', path: '/blocked', handle: ({ body }) => ({ status: 201, body: blocklist.add(body) }) },
];
