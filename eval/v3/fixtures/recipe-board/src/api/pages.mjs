import { layout } from '../views/layout.mjs';
import { recipeView } from '../views/recipe.mjs';
import { page } from './page.mjs';

export const routes = ({ recipes }) => [
  {
    method: 'GET', path: '/recipes/:id',
    handle: ({ params }) => {
      const recipe = recipes.get(params.id);
      return page(layout({ title: recipe.title, content: recipeView(recipe) }));
    },
  },
];
