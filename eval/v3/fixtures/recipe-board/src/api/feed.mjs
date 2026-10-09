import { rss } from '../feed/rss.mjs';
import { page } from './page.mjs';

export const routes = ({ recipes }) => [
  {
    method: 'GET', path: '/feed.xml',
    handle: () => page(rss(recipes.newest(20)), 'application/rss+xml; charset=utf-8'),
  },
];
