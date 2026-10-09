import { text } from '../lib/validate.mjs';
import { layout } from '../views/layout.mjs';
import { searchView } from '../views/search.mjs';
import { page } from './page.mjs';

const holds = (value, q) => value.toLowerCase().includes(q.toLowerCase());

export const routes = ({ recipes }) => [
  {
    method: 'GET', path: '/search',
    handle: ({ query }) => {
      const q = text(query.q ?? '', 'q', { min: 0, max: 100 }).trim();
      const found = q ? recipes.all().filter((r) => holds(r.title, q) || r.ingredients.some((line) => holds(line, q))) : [];
      return page(layout({ title: `Search: ${q}`, content: searchView(q, found) }));
    },
  },
];
