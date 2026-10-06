export const routes = ({ search }) => [
  { method: 'GET', path: '/search', handle: ({ query }) => ({ status: 200, body: search.search(query.q) }) },
];
