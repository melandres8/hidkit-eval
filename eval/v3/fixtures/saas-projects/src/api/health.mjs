export const routes = () => [
  { method: 'GET', path: '/health', public: true, handle: () => ({ status: 200, body: { ok: true } }) },
];
