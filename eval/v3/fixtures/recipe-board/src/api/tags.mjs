import { tag } from '../lib/validate.mjs';
import { layout } from '../views/layout.mjs';
import { tagView } from '../views/tags.mjs';
import { page } from './page.mjs';

export const routes = ({ recipes }) => [
  {
    method: 'GET', path: '/tags/:tag',
    handle: ({ params }) => {
      const name = tag(params.tag);
      const found = recipes.all().filter((r) => r.tags.includes(name));
      return page(layout({ title: `Tag ${name}`, content: tagView(name, found) }));
    },
  },
];
