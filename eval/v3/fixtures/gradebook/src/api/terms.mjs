export const routes = ({ runJob }) => [
  {
    method: 'POST', path: '/terms/:term/close',
    handle: ({ params }) => ({ status: 200, body: runJob('close-term', { term: params.term }) }),
  },
];
