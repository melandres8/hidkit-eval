export const routes = () => [
  { method: 'GET', path: '/health', handle: () => ({ status: 200, body: { ok: true } }) },
];
