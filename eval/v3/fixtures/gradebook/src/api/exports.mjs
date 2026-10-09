export const routes = ({ runJob }) => [
  {
    method: 'GET', path: '/terms/:term/export.csv',
    handle: ({ params }) => ({ status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' }, body: runJob('export-grades', { term: params.term }).csv }),
  },
];
