import { list, tag, text } from '../lib/validate.mjs';

function readRecipe(body = {}) {
  return {
    title: text(body.title, 'title', { max: 200 }),
    author: text(body.author, 'author', { max: 80 }),
    ingredients: list(body.ingredients, 'ingredients', { max: 50 }).map((line) => text(line, 'ingredient', { max: 200 })),
    steps: text(body.steps ?? '', 'steps', { min: 0, max: 5000 }),
    tags: list(body.tags, 'tags', { max: 10 }).map(tag),
  };
}

export const routes = ({ recipes }) => [
  {
    method: 'POST', path: '/api/recipes',
    handle: ({ body }) => ({ status: 201, body: recipes.add(readRecipe(body)) }),
  },
  {
    method: 'GET', path: '/api/recipes/:id',
    handle: ({ params }) => ({ status: 200, body: recipes.get(params.id) }),
  },
  {
    method: 'POST', path: '/api/recipes/:id/comments',
    handle: ({ params, body = {} }) => {
      const comment = { author: text(body.author, 'author', { max: 80 }), text: text(body.text, 'text', { max: 2000 }) };
      return { status: 201, body: recipes.addComment(params.id, comment) };
    },
  },
];
