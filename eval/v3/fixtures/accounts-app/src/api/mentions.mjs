import { suggestHandles } from '../mentions/autocomplete.mjs';

export const routes = ({ store }) => [
  { method: 'GET', path: '/mentions', handle: ({ query }) => ({ status: 200, body: suggestHandles(store, query.prefix) }) },
];
